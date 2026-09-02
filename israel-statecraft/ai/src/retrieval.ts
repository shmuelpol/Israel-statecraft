// Atlas retrieval: nearest-k over weighted state-signature features with hard
// compatibility gates. A node whose prerequisites contradict run facts is
// disqualified regardless of aggregate similarity (ADR 0006).

import type { AtlasNode, GameState } from '../../engine/src/types.js';
import { prerequisitesHold } from '../../engine/src/divergence.js';
import { isoToDay } from '../../engine/src/util.js';

export interface AtlasIndex {
  version: string;
  nodes: AtlasNode[];
}

export interface RetrievalHit {
  node: AtlasNode;
  compatibility: number; // 0..1
  distance: number;
}

export function stateSignature(state: GameState): Record<string, number> {
  const h = state.hidden;
  const m = state.metrics;
  return {
    day: state.simDay / 1200,
    hamas_strength: (h.hamas_strength ?? 50) / 100,
    hezbollah_strength: (h.hezbollah_strength ?? 50) / 100,
    syria_stability: (h.syria_stability ?? 50) / 100,
    iran_nuclear: (h.iran_nuclear_progress ?? 50) / 100,
    hostages_held: Math.min(1, (state.hostages.living + state.hostages.deceasedHeld) / 250),
    esc_gaza: (h.esc_gaza ?? 0) / 100,
    esc_north: (h.esc_north ?? 0) / 100,
    esc_iran: (h.esc_iran ?? 0) / 100,
    us_relations: (m.us_relations?.value ?? 50) / 100,
    normalization: (m.normalization?.value ?? 50) / 100,
    territorial_leverage: (h.territorial_leverage ?? 0) / 100,
    in_office: state.office.inOffice ? 1 : 0,
    divergence: state.divergence.aggregate,
  };
}

const FEATURE_WEIGHTS: Record<string, number> = {
  day: 2.0, hamas_strength: 1.2, hezbollah_strength: 1.4, syria_stability: 1.2,
  iran_nuclear: 1.2, hostages_held: 1.4, esc_gaza: 0.8, esc_north: 0.8, esc_iran: 1.0,
  us_relations: 0.8, normalization: 0.6, territorial_leverage: 0.8, in_office: 0.5, divergence: 0.6,
};

export function retrieveNodes(index: AtlasIndex, state: GameState, k: number): RetrievalHit[] {
  const sig = stateSignature(state);
  const startDate = state.clock.startDate;
  const hits: RetrievalHit[] = [];
  for (const node of index.nodes) {
    // hard gates: prerequisites must hold against RUN FACTS (facts win over Atlas)
    if (!prerequisitesHold(node.prerequisites, state)) continue;
    const nodeDay = isoToDay(startDate, node.date);
    if (Math.abs(nodeDay - state.simDay) > 200) continue; // temporal locality
    let d2 = 0; let wSum = 0;
    for (const [key, w] of Object.entries(FEATURE_WEIGHTS)) {
      const a = sig[key] ?? 0;
      const b = node.signature[key] ?? a; // missing feature: neutral
      d2 += w * (a - b) * (a - b);
      wSum += w;
    }
    const distance = Math.sqrt(d2 / wSum);
    const compatibility = Math.max(0, 1 - distance * 2.2) * node.confidence;
    hits.push({ node, compatibility, distance });
  }
  hits.sort((a, b) => b.compatibility - a.compatibility);
  return hits.slice(0, k);
}
