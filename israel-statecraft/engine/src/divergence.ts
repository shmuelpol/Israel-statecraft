// Historical similarity / divergence as a weighted feature vector (ADR 0006).
// Anchors contribute to their declared dimensions when they are missed,
// suppressed, or fired far from their historical date. Off-script events and
// divergent policy actions (counted by the orchestrator) contribute too.
// There is no snapback force anywhere: divergence only gates whether
// historical anchors remain *candidates*.

import type { GameState, CanonicalAnchor, Prerequisite, DivergenceState } from './types.js';
import { isoToDay, clamp } from './util.js';

export const DIVERGENCE_DIMS = [
  'policy', 'timing', 'leadership', 'actor_survival', 'territory', 'hostages',
  'capability', 'nuclear', 'alliances', 'domestic', 'knowledge', 'commitments', 'events',
] as const;

export type DivergenceDim = (typeof DIVERGENCE_DIMS)[number];

const DIM_WEIGHTS: Record<DivergenceDim, number> = {
  policy: 1.2, timing: 0.6, leadership: 1.0, actor_survival: 1.4, territory: 1.3,
  hostages: 1.1, capability: 0.9, nuclear: 1.2, alliances: 1.0, domestic: 0.7,
  knowledge: 0.6, commitments: 0.8, events: 1.0,
};

export function checkPrerequisite(p: Prerequisite, state: GameState): boolean {
  switch (p.kind) {
    case 'actorAlive': {
      const a = state.actors[p.actorId];
      if (!a) return false;
      return p.leader ? a.alive && a.leadership.alive : a.alive;
    }
    case 'regionController': return state.regions[p.regionId]?.controller === p.controller;
    case 'hiddenVarMin': return (state.hidden[p.varId] ?? 0) >= p.min;
    case 'hiddenVarMax': return (state.hidden[p.varId] ?? 0) <= p.max;
    case 'anchorFired': return state.anchorsFired.includes(p.anchorId);
    case 'anchorNotSuppressed': return !state.anchorsSuppressed.includes(p.anchorId);
    case 'hostagesHeldMin': return state.hostages.living + state.hostages.deceasedHeld >= p.min;
    case 'divergenceMax': return state.divergence.aggregate <= p.max;
  }
}

export function prerequisitesHold(prereqs: Prerequisite[], state: GameState): boolean {
  return prereqs.every((p) => checkPrerequisite(p, state));
}

export function computeDivergence(state: GameState, timeline: CanonicalAnchor[], openingAnchorId?: string): DivergenceState {
  const dims: Record<string, number> = Object.fromEntries(DIVERGENCE_DIMS.map((d) => [d, 0]));
  const counts: Record<string, number> = Object.fromEntries(DIVERGENCE_DIMS.map((d) => [d, 0]));
  const start = state.clock.startDate;
  // war-driven anchors shift with the actual opening-attack date (see Director.dueDay)
  const openingAnchor = openingAnchorId ? timeline.find((a) => a.id === openingAnchorId) : undefined;
  const historicalAttackDay = openingAnchor ? isoToDay(start, openingAnchor.date) : Number.POSITIVE_INFINITY;
  const shift = state.counters.oct7Day !== undefined ? Math.max(0, state.counters.oct7Day - historicalAttackDay) : 0;

  for (const a of timeline) {
    const base = isoToDay(start, a.date);
    const warDriven = a.divergenceDims.length > 0 && base >= historicalAttackDay && a.id !== openingAnchorId;
    // war-driven anchors are not "missed history" while the war hasn't started
    if (warDriven && state.counters.oct7Day === undefined) continue;
    const due = warDriven ? base + shift : base;
    if (state.simDay < due - a.windowDays) continue; // not yet expected
    const fired = state.anchorsFired.includes(a.id);
    const suppressed = state.anchorsSuppressed.includes(a.id);
    const overdue = state.simDay > due + a.windowDays;
    let contribution = 0;
    if (suppressed) contribution = 1;                    // prerequisites died: this history is gone
    else if (!fired && overdue) contribution = 0.8;      // missed its window
    else if (!fired) contribution = 0.15;                // inside window, pending
    for (const d of a.divergenceDims) {
      if (dims[d] === undefined) continue;
      dims[d] += contribution * a.weight;
      counts[d] += a.weight;
    }
  }
  for (const d of DIVERGENCE_DIMS) {
    dims[d] = counts[d] > 0 ? clamp(dims[d] / counts[d], 0, 1) : 0;
  }

  // orchestrator-maintained counters
  dims.policy = clamp(dims.policy + (state.counters.divergentPolicyActions ?? 0) * 0.12, 0, 1);
  dims.events = clamp(dims.events + (state.counters.offScriptEvents ?? 0) * 0.08, 0, 1);
  dims.commitments = clamp(dims.commitments + (state.counters.divergentCommitments ?? 0) * 0.15, 0, 1);

  let wSum = 0; let acc = 0;
  for (const d of DIVERGENCE_DIMS) { acc += dims[d] * DIM_WEIGHTS[d]; wSum += DIM_WEIGHTS[d]; }
  const aggregate = clamp(acc / wSum, 0, 1);
  const level = aggregate < 0.2 ? 'low' : aggregate < 0.5 ? 'moderate' : 'high';
  return { dims, aggregate, level };
}

/**
 * Is a canonical anchor still a legitimate candidate future?
 * Rules: its own prerequisites must hold, it must not be suppressed, and at
 * high divergence historical anchors lose privilege entirely unless their
 * causes are independently present (modeled via prerequisites still holding
 * AND the anchor being marked exogenous via weight 0 dims).
 */
export function anchorEligible(a: CanonicalAnchor, state: GameState): { eligible: boolean; reason?: string } {
  if (state.anchorsFired.includes(a.id)) return { eligible: false, reason: 'already fired' };
  if (state.anchorsSuppressed.includes(a.id)) return { eligible: false, reason: 'suppressed' };
  if (!prerequisitesHold(a.prerequisites, state)) return { eligible: false, reason: 'prerequisites broken' };
  if (state.divergence.level === 'high' && a.divergenceDims.length > 0) {
    return { eligible: false, reason: 'high divergence removed historical privilege' };
  }
  return { eligible: true };
}
