// Client API layer. Type-only imports from the server keep one source of truth.
import type { ClientView } from '../../server/runManager.js';
import type { RegionDef, ReplayEntry } from '../../../engine/src/types.js';

export type { ClientView };

export interface ScenarioInfo {
  meta: { id: string; version: string; titleHe: string; descriptionHe: string };
  clock: { startDate: string; endDate: string; tickMs: number; daysPerSecond: number };
  metrics: { id: string; nameHe: string; descHe: string; icon: string }[];
  regions: RegionDef[];
  points: Record<string, [number, number]>;
  bounds: { lonMin: number; lonMax: number; latMin: number; latMax: number };
  actors: { id: string; nameHe: string }[];
  provider: string;
  models: { id: string; nameHe: string; noteHe: string; tier: string }[];
  defaultModel: string;
  liveAvailable: boolean;
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

export const api = {
  scenario: (): Promise<ScenarioInfo> => fetch('/api/scenario').then((r) => r.json()),
  newRun: (seed?: string, model?: string): Promise<{ runId: string }> => post('/api/runs', { seed, model }),
  listRuns: (): Promise<{ runId: string; meta: { createdAt?: string; seed?: string } }[]> => fetch('/api/runs').then((r) => r.json()),
  state: (runId: string): Promise<ClientView> => fetch(`/api/state?runId=${runId}`).then((r) => r.json()),
  message: (runId: string, text: string, contextIds: string[], eventId?: string, optionId?: string, channel: 'auto' | 'internal' | 'public' = 'auto') =>
    post('/api/message', { runId, text, contextIds, eventId, optionId, channel }),
  briefing: (runId: string, topic: string): Promise<{ topic: string; nameHe: string; summaryHe: string[]; policyHe: { lineHe: string; tensionHe: string; questionHe: string }; significantHe: string[]; decisionsHe: { textHe: string; consequencesHe: string[] }[] }> =>
    fetch(`/api/briefing?runId=${runId}&topic=${topic}`).then((r) => r.json()),
  briefingDeep: (runId: string, topic: string): Promise<{ ok: boolean; live: boolean }> =>
    post('/api/briefing-deep', { runId, topic }),
  typing: (runId: string) => post('/api/typing', { runId }),
  context: (runId: string, ids: string[]) => post('/api/context', { runId, ids }),
  director: (runId: string, text: string) => post('/api/director', { runId, text }),
  replay: (runId: string): Promise<ReplayEntry[]> => fetch(`/api/replay?runId=${runId}`).then((r) => r.json()),
};

export function connectWs(runId: string, onView: (v: ClientView) => void): () => void {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws?runId=${runId}`);
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as { type: string; payload: ClientView };
      if (msg.type === 'view') onView(msg.payload);
    } catch { /* ignore malformed frames */ }
  };
  return () => ws.close();
}
