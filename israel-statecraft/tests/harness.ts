// Headless test/calibration harness: drives the exact same Run object the
// server uses, but with manual stepping and an in-memory log.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Run } from '../app/server/runManager.js';
import { SCENARIO } from '../scenarios/swords-of-iron/index.js';
import type { AtlasIndex } from '../ai/src/retrieval.js';
import type { ScenarioPackage } from '../engine/src/types.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let atlasCache: AtlasIndex | null | undefined;
export function loadAtlas(): AtlasIndex | null {
  if (atlasCache !== undefined) return atlasCache;
  const p = path.join(root, 'atlas', 'out', 'atlas.json');
  atlasCache = existsSync(p) ? (JSON.parse(readFileSync(p, 'utf-8')) as AtlasIndex) : null;
  return atlasCache;
}

export interface PolicyScript {
  name: string;
  /** answer an active decision event; return optionId or free text or null to ignore */
  onEvent?: (run: Run, eventId: string, options: { id: string; labelHe: string }[], type: string, titleHe: string) => { optionId?: string; text?: string } | null;
  /** called every ~30 sim days */
  periodic?: (run: Run, simDay: number) => void;
}

export interface HeadlessResult {
  run: Run;
  /** present when the run reached the scenario end */
  score: Run['score'];
  days: number;
  activeEventPeaks: number[];
  eventCount: number;
}

export function newRun(seed: string, scenario: ScenarioPackage = SCENARIO, persistDir: string | null = null): Run {
  return new Run(`test-${seed}`, seed, scenario, loadAtlas(), persistDir, 'mock');
}

/**
 * Drive a run to completion (or maxDays) with a policy script.
 * stepMs must stay constant for determinism comparisons.
 */
export function playHeadless(run: Run, script: PolicyScript, maxDays = 1200, stepMs = 500): HeadlessResult {
  const answered = new Set<string>();
  let lastPeriodic = -999;
  const peaks: number[] = [];
  let spawned = 0;
  let guard = 0;
  const seen = new Set<string>();

  while (!run.sim.state.ended && run.sim.state.simDay < maxDays && guard++ < 400000) {
    run.step(stepMs);
    const s = run.sim.state;
    const active = Object.values(s.events).filter((e) => e.status === 'active');
    peaks.push(active.length);
    for (const ev of active) {
      if (!seen.has(ev.id)) { seen.add(ev.id); spawned++; }
      if (answered.has(ev.id) || !script.onEvent) continue;
      const ans = script.onEvent(run, ev.id, ev.options, ev.type, ev.titleHe);
      answered.add(ev.id);
      if (ans) run.handleMessage(ans.text ?? '', [], ev.id, ans.optionId);
    }
    if (script.periodic && s.simDay - lastPeriodic >= 30) {
      lastPeriodic = s.simDay;
      script.periodic(run, s.simDay);
    }
  }
  // final scoring happens inside step() when ended; ensure it ran
  if (run.sim.state.ended && !run.score) run.step(stepMs);
  if (run.sim.state.ended && !run.score) throw new Error('ended run did not produce a score');
  return {
    run,
    score: run.score,
    days: run.sim.state.simDay,
    activeEventPeaks: peaks,
    eventCount: spawned,
  };
}

/** Intents that correspond to the broadly historical policy line. */
const HISTORICAL_INTENTS = new Set([
  'order_dual_aims', 'order_gaza_first', 'order_ground_op', 'accept_deal', 'approve_covert',
  'order_measured_retaliation', 'order_rafah', 'order_syria_strikes', 'order_iran_campaign',
  'order_resume_war', 'comply_usa', 'partial_comply_usa', 'expand_aid', 'ease_reserves',
  'request_us_supply', 'defer_commission', 'order_measured_response', 'defer_coalition',
  'coalition_yield', 'probe_normalization', 'order_contain',
]);

/** Answers every decision event with the historically corresponding option. */
export const historicalScript: PolicyScript = {
  name: 'historical-like',
  onEvent: (run, id) => {
    const ev = run.sim.state.events[id];
    if (!ev || !ev.options.length) return null;
    const opt = ev.options.find((o) => HISTORICAL_INTENTS.has(o.intent)) ?? ev.options[0];
    return { optionId: opt.id };
  },
};

export const passiveScript: PolicyScript = { name: 'passive' };

export function randomScript(pick: (n: number, key: string) => number): PolicyScript {
  return {
    name: 'random',
    onEvent: (_run, id, options) => {
      if (!options.length) return null;
      return { optionId: options[pick(options.length, id)].id };
    },
  };
}
