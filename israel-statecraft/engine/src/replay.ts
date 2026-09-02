// Replay = fold(recorded log). No model calls, no re-rolls — pure data.
// The visual replay and the decision audit are both derived from ReplayEntry
// streams; private chain-of-thought never exists in the log to begin with.

import type { ReplayEntry, CommMessage, ActionableEvent, WorldPlan, DrawRecord, FinalScoreReport } from './types.js';

export interface ReplayFrame {
  simDay: number;
  metrics?: Record<string, number>;
  hostages?: { living: number; deceasedHeld: number };
  comm?: CommMessage;
  event?: { op: 'spawned' | 'answered' | 'expired' | 'resolved'; ev: Partial<ActionableEvent> & { id: string } };
  mapChange?: { regionId: string; controller?: string; status?: string; intensity?: number };
  office?: { inOffice: boolean; reasonHe?: string };
  playerMsg?: { id: string; text: string; contextIds: string[]; late?: boolean };
  contextSelect?: string[];
  score?: FinalScoreReport;
}

export interface DecisionAuditEntry {
  simDay: number;
  planId: string;
  provenance: WorldPlan['provenance'];
  actorDecisions: WorldPlan['actorDecisions'];
  trendCount: number;
  eventCount: number;
}

export interface ReplayData {
  frames: ReplayFrame[];
  audit: DecisionAuditEntry[];
  draws: DrawRecord[];
  meta: { runId?: string; seed?: string; versions?: unknown; endDay: number };
  hashes: { simDay: number; hash: number }[];
}

export function foldReplay(entries: ReplayEntry[]): ReplayData {
  const frames: ReplayFrame[] = [];
  const audit: DecisionAuditEntry[] = [];
  const draws: DrawRecord[] = [];
  const hashes: { simDay: number; hash: number }[] = [];
  const meta: ReplayData['meta'] = { endDay: 0 };

  for (const e of entries) {
    meta.endDay = Math.max(meta.endDay, e.simDay);
    if (e.stateHash !== undefined) hashes.push({ simDay: e.simDay, hash: e.stateHash });
    const p = e.payload as Record<string, unknown>;
    switch (e.type) {
      case 'run_start': {
        meta.runId = p.runId as string; meta.seed = p.seed as string; meta.versions = p.versions;
        break;
      }
      case 'metrics_snapshot':
        frames.push({ simDay: e.simDay, metrics: p.metrics as Record<string, number>, hostages: p.hostages as ReplayFrame['hostages'] });
        break;
      case 'comm':
        frames.push({ simDay: e.simDay, comm: e.payload as CommMessage });
        break;
      case 'event_spawned':
        frames.push({ simDay: e.simDay, event: { op: 'spawned', ev: e.payload as ActionableEvent } });
        break;
      case 'event_answered':
        frames.push({ simDay: e.simDay, event: { op: 'answered', ev: { id: p.eventId as string } } });
        break;
      case 'event_expired':
        frames.push({ simDay: e.simDay, event: { op: 'expired', ev: { id: p.id as string } } });
        break;
      case 'event_resolved':
        frames.push({ simDay: e.simDay, event: { op: 'resolved', ev: { id: p.eventId as string } } });
        break;
      case 'map_change':
        frames.push({ simDay: e.simDay, mapChange: e.payload as ReplayFrame['mapChange'] });
        break;
      case 'office_change':
        frames.push({ simDay: e.simDay, office: { inOffice: p.inOffice as boolean, reasonHe: p.reasonHe as string } });
        break;
      case 'player_msg':
        frames.push({ simDay: e.simDay, playerMsg: { id: p.id as string, text: p.text as string, contextIds: (p.contextIds as string[]) ?? [], late: p.late as boolean } });
        break;
      case 'context_select':
        frames.push({ simDay: e.simDay, contextSelect: p.ids as string[] });
        break;
      case 'plan_applied': {
        const plan = p.plan as WorldPlan;
        audit.push({
          simDay: e.simDay, planId: plan.id, provenance: plan.provenance,
          actorDecisions: plan.actorDecisions, trendCount: plan.trends.length, eventCount: plan.events.length,
        });
        break;
      }
      case 'draw':
        draws.push(e.payload as DrawRecord);
        break;
      case 'score':
        frames.push({ simDay: e.simDay, score: e.payload as FinalScoreReport });
        break;
      default:
        break;
    }
  }
  frames.sort((a, b) => a.simDay - b.simDay);
  return { frames, audit, draws, meta, hashes };
}

/** Guard used by tests and the replay API: a replay must never invoke a model. */
export function assertNoModelCallsInReplay(fetchCount: number): void {
  if (fetchCount !== 0) throw new Error(`replay attempted ${fetchCount} model calls — forbidden`);
}
