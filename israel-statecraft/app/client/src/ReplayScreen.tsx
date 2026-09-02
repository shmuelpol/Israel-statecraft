// Visual replay + decision audit. Pure fold over the recorded log — this
// screen has no path to any model, and the audit shows structured decisions
// with concise rationales only (never chain-of-thought).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ScenarioInfo } from './api.js';
import { foldReplay, type ReplayData } from '../../../engine/src/replay.js';
import { MapView, computeViewport, fullWindow, type MapWindow, type RegionView } from './MapView.js';
import { ScoreOverlay, useContainerSize } from './GameScreen.js';

function hebDate(startIso: string, day: number): string {
  const d = new Date(Date.parse(startIso + 'T00:00:00Z') + Math.floor(day) * 86400000);
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function ReplayScreen({ scenario, runId, onExit }: { scenario: ScenarioInfo; runId: string; onExit: () => void }) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const dark = document.documentElement.dataset.theme === 'dark';
  const mapRef = useRef<HTMLElement>(null);
  const mapSize = useContainerSize(mapRef);
  const viewport = useMemo(() => computeViewport(scenario.bounds, mapSize.w, mapSize.h), [scenario, mapSize]);
  const [mapWin, setMapWin] = useState<MapWindow | null>(null);

  useEffect(() => {
    api.replay(runId).then((entries) => {
      const folded = foldReplay(entries);
      setData(folded);
      setDay(0);
    }).catch(() => undefined);
  }, [runId]);

  useEffect(() => {
    if (!playing || !data) return;
    const t = setInterval(() => setDay((d) => Math.min(data.meta.endDay, d + 4)), 120);
    return () => clearInterval(t);
  }, [playing, data]);

  const snapshot = useMemo(() => {
    if (!data) return null;
    const regions: Record<string, RegionView> = {};
    for (const r of scenario.regions) regions[r.id] = { controller: r.initialController, status: 'normal', intensity: 0, overlays: [] };
    let metrics: Record<string, number> = {};
    const comms: { id: string; simDay: number; senderHe: string; kind: string; text: string }[] = [];
    let office = true;
    const activeEvents = new Map<string, { id: string; titleHe: string; regionId?: string; anchor?: [number, number]; urgency: string }>();
    const playerMsgs: { id: string; simDay: number; text: string; contextIds: string[] }[] = [];
    let currentContext: string[] = []; // what the player was looking at
    let lastContextDay = -999;
    for (const f of data.frames) {
      if (f.simDay > day) break;
      if (f.contextSelect) { currentContext = f.contextSelect; lastContextDay = f.simDay; }
      if (f.metrics) metrics = f.metrics;
      if (f.mapChange) {
        const r = regions[f.mapChange.regionId];
        if (r) {
          if (f.mapChange.controller) r.controller = f.mapChange.controller;
          if (f.mapChange.status) r.status = f.mapChange.status;
          if (f.mapChange.intensity !== undefined) r.intensity = f.mapChange.intensity;
        }
      }
      if (f.comm) comms.push({ id: f.comm.id, simDay: f.simDay, senderHe: f.comm.senderHe, kind: f.comm.kind, text: f.comm.textHe });
      if (f.office) office = f.office.inOffice;
      if (f.event) {
        if (f.event.op === 'spawned') {
          const ev = f.event.ev as { id: string; titleHe?: string; regionId?: string; anchor?: [number, number]; urgency?: string };
          activeEvents.set(ev.id, { id: ev.id, titleHe: ev.titleHe ?? '', regionId: ev.regionId, anchor: ev.anchor, urgency: ev.urgency ?? 'window' });
        } else {
          activeEvents.delete(f.event.ev.id);
        }
      }
      if (f.playerMsg) playerMsgs.push({ id: f.playerMsg.id, simDay: f.simDay, text: f.playerMsg.text, contextIds: f.playerMsg.contextIds });
    }
    // context is transient — only show it as "currently looking at" if selected recently
    const activeContext = day - lastContextDay < 40 ? currentContext : [];
    return { regions, metrics, comms: comms.slice(-25), office, activeEvents: [...activeEvents.values()], playerMsgs: playerMsgs.slice(-12), activeContext };
  }, [data, day, scenario]);

  const contextLabel = (id: string): string => {
    const [type, key] = id.split(':');
    if (type === 'region') return scenario.regions.find((r) => r.id === key)?.nameHe ?? key;
    if (type === 'metric') return scenario.metrics.find((m) => m.id === key)?.nameHe ?? key;
    if (type === 'event') return 'אירוע';
    if (type === 'comm') return 'הודעה';
    return id;
  };

  const auditUpTo = useMemo(() => (data?.audit ?? []).filter((a) => a.simDay <= day).slice(-12), [data, day]);
  const score = useMemo(() => data?.frames.find((f) => f.score)?.score ?? null, [data]);

  if (!data || !snapshot) return <div className="home"><h1>שחזור</h1><p className="desc">טוען יומן ריצה…</p></div>;

  return (
    <div className="replay-grid">
      <header className="topbar panel">
        <span className="title">🎞️ שחזור ריצה</span>
        <span className="date">{hebDate(scenario.clock.startDate, day)}</span>
        <div className="progress"><div style={{ width: `${(day / Math.max(1, data.meta.endDay)) * 100}%` }} /></div>
        {!snapshot.office && <span style={{ color: 'var(--danger)', fontSize: 12 }}>מצב צופה</span>}
        {score && <button className="iconbtn" onClick={() => setShowScore(true)}>דו״ח סיום</button>}
        <button className="iconbtn" onClick={onExit}>חזרה</button>
      </header>

      <main className="map-area" ref={mapRef}>
        <MapView scenario={scenario} viewport={viewport} window={mapWin ?? fullWindow(viewport)} onWindowChange={setMapWin}
          regions={snapshot.regions} selected={new Set()} dark={dark} onSelectRegion={() => undefined}>
        </MapView>
        {snapshot.activeEvents.slice(0, 3).map((ev, i) => (
          <div key={ev.id} className={`event-card u-${ev.urgency}`} style={{ left: `${8 + i * 4}%`, top: `${8 + i * 16}%`, width: 220 }}>
            <div className="ribbon" /><div className="body"><h4>👁️ הוצג לשחקן: {ev.titleHe}</h4></div>
          </div>
        ))}
      </main>

      <aside className="replay-side panel">
        <h3>🎬 מסך השחקן</h3>
        <div className="player-screen">
          <div className="ps-block">
            <span className="ps-label">👁️ מה הוצג כרגע:</span>
            {snapshot.activeEvents.length ? snapshot.activeEvents.map((e) => <span key={e.id} className="ps-card">{e.titleHe}</span>) : <span className="soft"> שקט — אין קלף החלטה פעיל</span>}
          </div>
          <div className="ps-block">
            <span className="ps-label">🖱️ מה סימן (הקשר):</span>
            {snapshot.activeContext.length ? snapshot.activeContext.map((c) => <span key={c} className="ps-chip">{contextLabel(c)}</span>) : <span className="soft"> —</span>}
          </div>
          <div className="ps-block">
            <span className="ps-label">⌨️ מה כתב / לחץ:</span>
            {snapshot.playerMsgs.length === 0 && <div className="soft">טרם פעל</div>}
            {snapshot.playerMsgs.map((m) => (
              <div key={m.id} className="ps-action">
                <span className="when">{hebDate(scenario.clock.startDate, m.simDay)}</span>
                {m.text.startsWith('[החלטה]') ? <span className="ps-click">{m.text}</span> : <span className="ps-write">✎ {m.text}</span>}
                {m.contextIds.length > 0 && <span className="ps-with"> (עם הקשר: {m.contextIds.map(contextLabel).join(', ')})</span>}
              </div>
            ))}
          </div>
        </div>
        <h3>מדדים (שבועי)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
          {Object.entries(snapshot.metrics).filter(([k]) => scenario.metrics.some((m) => m.id === k)).slice(0, 12).map(([k, v]) => (
            <div key={k} className="score-dim">
              <span style={{ minWidth: 110 }}>{scenario.metrics.find((m) => m.id === k)?.nameHe ?? k}</span>
              <span className="db"><div style={{ width: `${v}%` }} /></span>
            </div>
          ))}
        </div>
        <h3>יומן תקשורת</h3>
        {snapshot.comms.map((c) => (
          <div key={c.id} className={`comm k-${c.kind}`} style={{ marginBottom: 5 }}>
            <div className="head"><span className="sender">{c.senderHe}</span><span className="when">{hebDate(scenario.clock.startDate, c.simDay)}</span></div>
            {c.text}
          </div>
        ))}
        <h3>ביקורת החלטות (ללא שרשרת חשיבה)</h3>
        {auditUpTo.map((a) => (
          <div key={a.planId} className="audit-item">
            <div><b>{hebDate(scenario.clock.startDate, a.simDay)}</b> · תוכנית {a.planId}</div>
            <div className="prov">אטלס: {a.provenance.mode}{a.provenance.reason ? ` — ${a.provenance.reason}` : ''} ({a.provenance.nodeIds.slice(0, 2).join(', ') || 'ללא צמתים'})</div>
            {a.actorDecisions.map((d, i) => (
              <div key={i} className="rationale">🎭 {d.actorId} [{d.language}] ← {d.intent}: {d.rationaleShort}</div>
            ))}
          </div>
        ))}
      </aside>

      <footer className="replay-controls panel">
        <button className="iconbtn" onClick={() => setPlaying(!playing)}>{playing ? '⏸ השהיית שחזור' : '▶ ניגון'}</button>
        <input type="range" min={0} max={Math.ceil(data.meta.endDay)} value={day}
          onChange={(e) => { setPlaying(false); setDay(Number(e.target.value)); }}
          aria-label="ציר זמן השחזור" />
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>יום {Math.floor(day)} מתוך {Math.ceil(data.meta.endDay)}</span>
      </footer>

      {showScore && score && <ScoreOverlay score={score} onExit={() => setShowScore(false)} runId={runId} />}
    </div>
  );
}
