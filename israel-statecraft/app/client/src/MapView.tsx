// Dynamic SVG map — the main play surface. Original stylized geometry.
// The Golan renders inside Israel's single polygon: no boundary exists in the
// data, so none can render. The West Bank is a distinct polygon.
// Supports pan (drag) and zoom (wheel/buttons); the default framing centers
// Israel. War status is conveyed on the map itself: escalation glow, contested
// hatching, and overlay badges (fronts, buffers, corridors, closures).

import React, { useMemo, useRef } from 'react';
import type { ScenarioInfo } from './api.js';

export interface RegionView { controller: string; status: string; intensity: number; overlays: string[] }

/** Region fills come from CSS variables (styles.css) so theme switches apply atomically. */
const KNOWN_CONTROLLERS = new Set([
  'israel', 'hamas', 'pa', 'lebanon_state', 'hezbollah', 'syria_regime',
  'jordan', 'egypt', 'saudi', 'iraq', 'iran', 'turkey', 'none',
]);
function controllerFill(controller: string): string {
  const key = KNOWN_CONTROLLERS.has(controller) ? controller : 'none';
  return `var(--terr-${key})`;
}

/** Hebrew labels for map-state overlay primitives (war status made visible). */
const OVERLAY_LABELS: Record<string, string> = {
  front_gaza: '⚔️ חזית פעילה', front_north: '⚔️ חזית פעילה', invasion_north: '🚨 פלישה',
  evacuated_south: '🏚️ יישובים מפונים', idf_north_gaza: '🪖 שליטת צה״ל בצפון',
  idf_philadelphi: '🪖 ציר פילדלפי', idf_rafah: '🪖 רפיח', idf_south_lebanon: '🪖 כוחותינו בדרום',
  idf_buffer_hermon: '🪖 חיץ החרמון', idf_buffer_deep: '🪖 חיץ מורחב',
  destroyed_air_defense: '💥 הגנ״א הושמדה', ceasefire_line: '🕊️ הפסקת אש',
  yellow_line: '📏 הקו הצהוב', naval_threat: '⚓ איום על השיט', hormuz_closed: '⛔ המיצר סגור',
  air_campaign: '✈️ מערכה אווירית',
};

export interface MapViewport {
  lonMin: number; lonMax: number; latMin: number; latMax: number;
  w: number; h: number;
}

/** Visible window (pan/zoom) within the projected viewport, in viewport units. */
export interface MapWindow { x: number; y: number; w: number; h: number }

const LAT_COMPRESS = Math.cos((32.5 * Math.PI) / 180);

export function computeViewport(bounds: ScenarioInfo['bounds'], containerW: number, containerH: number): MapViewport {
  const aspect = containerW > 0 && containerH > 0 ? containerW / containerH : 1.6;
  let spanLon = bounds.lonMax - bounds.lonMin;
  let spanLat = bounds.latMax - bounds.latMin;
  const naturalAspect = (spanLon * LAT_COMPRESS) / spanLat;
  let lonMin = bounds.lonMin; let latMin = bounds.latMin;
  if (aspect > naturalAspect) {
    const targetSpanLon = (aspect * spanLat) / LAT_COMPRESS;
    lonMin -= (targetSpanLon - spanLon) * 0.8;
    spanLon = targetSpanLon;
  } else {
    const targetSpanLat = (spanLon * LAT_COMPRESS) / aspect;
    latMin -= (targetSpanLat - spanLat) * 0.5;
    spanLat = targetSpanLat;
  }
  return { lonMin, lonMax: lonMin + spanLon, latMin, latMax: latMin + spanLat, w: 1000, h: 1000 / aspect };
}

export function project(vp: MapViewport, lon: number, lat: number): [number, number] {
  const kx = vp.w / (vp.lonMax - vp.lonMin);
  const ky = vp.h / (vp.latMax - vp.latMin);
  return [(lon - vp.lonMin) * kx, (vp.latMax - lat) * ky];
}

/** Window framing a lon/lat rect (aspect-fit inside the viewport aspect). */
export function windowFor(vp: MapViewport, lonA: number, latA: number, lonB: number, latB: number): MapWindow {
  const [x1, y1] = project(vp, lonA, latB);
  const [x2, y2] = project(vp, lonB, latA);
  let w = x2 - x1; let h = y2 - y1;
  const aspect = vp.w / vp.h;
  if (w / h < aspect) { const nw = h * aspect; return clampWindow(vp, { x: x1 - (nw - w) / 2, y: y1, w: nw, h }); }
  const nh = w / aspect;
  return clampWindow(vp, { x: x1, y: y1 - (nh - h) / 2, w, h: nh });
}

export function fullWindow(vp: MapViewport): MapWindow {
  return { x: 0, y: 0, w: vp.w, h: vp.h };
}

/** Default framing: Israel large and central, immediate theaters visible. */
export function israelWindow(vp: MapViewport): MapWindow {
  return windowFor(vp, 32.4, 28.9, 38.6, 34.6);
}

export function clampWindow(vp: MapViewport, win: MapWindow): MapWindow {
  const w = Math.min(Math.max(win.w, vp.w * 0.08), vp.w);
  const h = w * (vp.h / vp.w);
  return {
    x: Math.min(Math.max(win.x, 0), vp.w - w),
    y: Math.min(Math.max(win.y, 0), vp.h - h),
    w, h,
  };
}

interface Props {
  scenario: ScenarioInfo;
  viewport: MapViewport;
  window: MapWindow;
  onWindowChange: (w: MapWindow) => void;
  regions: Record<string, RegionView>;
  selected: Set<string>;
  onSelectRegion: (id: string) => void;
  dark: boolean;
  children?: React.ReactNode; // event anchors layer
}

export function MapView({ scenario, viewport, window: win, onWindowChange, regions, selected, onSelectRegion, dark, children }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; winX: number; winY: number; moved: boolean } | null>(null);
  const zoomScale = viewport.w / win.w;

  const paths = useMemo(() => scenario.regions.map((r) => ({
    def: r,
    d: 'M' + r.polygon.map(([lon, lat]) => project(viewport, lon, lat).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z',
    label: r.labelAt ? project(viewport, r.labelAt[0], r.labelAt[1]) : null,
  })), [scenario, viewport]);

  // pixel → viewport-unit conversion for pan/zoom
  const unitsPerPixel = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? win.w / rect.width : 1;
  };

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 1.18 : 1 / 1.18;
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const nw = win.w * factor;
    const nh = win.h * factor;
    onWindowChange(clampWindow(viewport, {
      x: win.x + (win.w - nw) * fx,
      y: win.y + (win.h - nh) * fy,
      w: nw, h: nh,
    }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, winX: win.x, winY: win.y, moved: false };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const upp = unitsPerPixel();
    const dx = (e.clientX - drag.current.x) * upp;
    const dy = (e.clientY - drag.current.y) * upp;
    if (Math.abs(dx) + Math.abs(dy) > 2 * upp) drag.current.moved = true;
    onWindowChange(clampWindow(viewport, { x: drag.current.winX - dx, y: drag.current.winY - dy, w: win.w, h: win.h }));
  };
  const onPointerUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  const fontBase = 15 / Math.max(1, zoomScale * 0.75);

  return (
    <svg ref={svgRef} className="map-svg" viewBox={`${win.x} ${win.y} ${win.w} ${win.h}`}
      preserveAspectRatio="none" role="img" aria-label="מפת המרחב"
      onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      style={{ cursor: drag.current ? 'grabbing' : 'grab', touchAction: 'none' }}>
      <defs>
        <pattern id="contested" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(160,60,40,0.35)" strokeWidth="3" />
        </pattern>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="rgba(200,70,40,0.5)" />
          <stop offset="100%" stopColor="rgba(200,70,40,0)" />
        </radialGradient>
      </defs>
      {['sea', 'country', 'territory', 'zone'].map((kind) =>
        paths.filter((p) => p.def.kind === kind).map((p) => {
          const st = regions[p.def.id];
          const controller = st?.controller ?? p.def.initialController;
          const fill = p.def.kind === 'sea' ? 'var(--sea-deep)' : controllerFill(controller);
          return (
            <g key={p.def.id}>
              <path
                className={`region ${selected.has('region:' + p.def.id) ? 'selected' : ''}`}
                d={p.d}
                fill={fill}
                stroke={dark ? 'rgba(10,14,22,0.7)' : 'rgba(90,80,55,0.45)'}
                strokeWidth={(p.def.id === 'israel' ? 2.2 : p.def.kind === 'territory' ? 1.6 : 1) / Math.max(1, zoomScale * 0.6)}
                strokeDasharray={p.def.kind === 'country' && p.def.id !== 'israel' ? '7 4' : undefined}
                onClick={() => { if (!drag.current?.moved && p.def.selectable) onSelectRegion(p.def.id); }}
                aria-label={p.def.nameHe}
              />
              {st && st.status === 'contested' && <path d={p.d} fill="url(#contested)" pointerEvents="none" />}
              {st && st.intensity > 0.08 && p.label && (
                <circle className="intensity-glow" cx={p.label[0]} cy={p.label[1]} r={(12 + st.intensity * 30) / Math.max(1, zoomScale * 0.5)} fill="url(#glow)" opacity={Math.min(1, st.intensity + 0.15)} />
              )}
              {st && st.intensity > 0.55 && p.label && (
                // flash-era hotspot marker (ref 02's explosion stars) — war status read off the map
                <text className="hotspot" x={p.label[0] + 16 / Math.max(1, zoomScale * 0.6)} y={p.label[1] - 10 / Math.max(1, zoomScale * 0.6)} fontSize={15 / Math.max(1, zoomScale * 0.5)} textAnchor="middle" pointerEvents="none">💥</text>
              )}
            </g>
          );
        }),
      )}
      {paths.filter((p) => p.label && p.def.id !== 'cyprus').map((p) => {
        const st = regions[p.def.id];
        const badges = (st?.overlays ?? []).map((o) => OVERLAY_LABELS[o]).filter(Boolean).slice(0, 3);
        const fs = p.def.kind === 'territory' ? fontBase * 0.75 : fontBase;
        return (
          <g key={'l' + p.def.id} pointerEvents="none">
            <text className="region-label" x={p.label![0]} y={p.label![1]} fontSize={fs} fontWeight={p.def.id === 'israel' ? 800 : 600}>
              {p.def.nameHe}
            </text>
            {st && st.intensity > 0.35 && <text x={p.label![0]} y={p.label![1] - fs * 1.2} fontSize={fs * 0.9} textAnchor="middle">⚔️</text>}
            {badges.map((b, i) => (
              <text key={i} className="overlay-badge" x={p.label![0]} y={p.label![1] + fs * (1.3 + i * 1.15)} fontSize={fs * 0.62} textAnchor="middle">
                {b}
              </text>
            ))}
          </g>
        );
      })}
      {children}
    </svg>
  );
}
