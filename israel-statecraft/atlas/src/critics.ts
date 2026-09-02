// Atlas critic passes (seed §10). All critics must pass before an Atlas ships.
// The historical-snapback critic produces a measurable rate reported in the
// coverage report; the generator must keep it at zero.

import type { AtlasNode } from '../../engine/src/types.js';
import { TIMELINE } from '../../scenarios/swords-of-iron/timeline.js';

export interface CriticReport {
  critic: string;
  violations: { nodeId: string; detail: string }[];
}

type GenNode = AtlasNode & { removedAnchors?: string[] };

/** Keywords that only become knowable at a given date (leak detector). */
const DATED_KEYWORDS: { after: string; words: string[] }[] = [
  { after: '2024-09-17', words: ['pager operation', 'ביפרים'] },
  { after: '2024-09-27', words: ['Nasrallah killed', 'نصر الله (مقتول)'] },
  { after: '2024-12-08', words: ['al-Sharaa', 'الشرع', 'Assad fell'] },
  { after: '2025-06-13', words: ['12-day war', 'deep campaign proven', 'Fordow struck'] },
  { after: '2025-10-10', words: ['yellow line', '20-point framework', 'Board of Peace'] },
  { after: '2026-02-28', words: ['Mojtaba', 'مجتبی', 'Khamenei killed', 'Hormuz closed'] },
  { after: '2026-06-17', words: ['Islamabad memorandum'] },
];

function nodeText(n: AtlasNode): string {
  return JSON.stringify([n.groundTruth, n.actorBeliefs, n.expectedDevelopments, n.knownUnknowns]);
}

/** 1. Future-knowledge leakage: no node may contain facts dated after it. */
export function futureLeakageCritic(nodes: GenNode[]): CriticReport {
  const violations: CriticReport['violations'] = [];
  for (const n of nodes) {
    const txt = nodeText(n);
    for (const k of DATED_KEYWORDS) {
      if (Date.parse(n.date) < Date.parse(k.after)) {
        for (const w of k.words) {
          if (txt.includes(w)) violations.push({ nodeId: n.id, detail: `references "${w}" knowable only after ${k.after}` });
        }
      }
    }
    // trajectories must not name specific future anchors as certainties
    for (const t of n.trajectories) {
      for (const s of t.steps) {
        for (const a of TIMELINE) {
          if (Date.parse(a.date) > Date.parse(n.date) && s.development.includes(a.id)) {
            violations.push({ nodeId: n.id, detail: `trajectory step names future anchor ${a.id} as fact` });
          }
        }
      }
    }
  }
  return { critic: 'future-knowledge-leakage', violations };
}

/**
 * 2. Historical snapback: a branch node that removed an anchor's causes must
 * not still expect that anchor (or its dependents) to occur.
 */
export function snapbackCritic(nodes: GenNode[]): CriticReport {
  const violations: CriticReport['violations'] = [];
  const dependents = new Map<string, string[]>();
  for (const a of TIMELINE) {
    for (const p of a.prerequisites) {
      if (p.kind === 'anchorFired') {
        dependents.set(p.anchorId, [...(dependents.get(p.anchorId) ?? []), a.id]);
      }
    }
  }
  for (const n of nodes) {
    if (!n.branchFamily || !n.removedAnchors?.length) continue;
    const forbidden = new Set<string>(n.removedAnchors);
    for (const r of n.removedAnchors) for (const d of dependents.get(r) ?? []) forbidden.add(d);
    const txt = JSON.stringify([n.expectedDevelopments, n.trajectories]);
    for (const f of forbidden) {
      if (txt.includes(`anchor:${f}`) || txt.includes(`"${f}"`)) {
        violations.push({ nodeId: n.id, detail: `expects removed/dependent anchor ${f} despite missing causes` });
      }
    }
  }
  return { critic: 'historical-snapback', violations };
}

/** 3. Diversity: branch nodes must be materially distinct from the canonical spine at the same date. */
export function diversityCritic(nodes: GenNode[]): CriticReport {
  const violations: CriticReport['violations'] = [];
  const canonical = nodes.filter((n) => n.era === 'canonical');
  const nearest = (date: string) =>
    canonical.reduce((best, c) => Math.abs(Date.parse(c.date) - Date.parse(date)) < Math.abs(Date.parse(best.date) - Date.parse(date)) ? c : best, canonical[0]);
  for (const n of nodes) {
    if (!n.branchFamily) continue;
    const ref = nearest(n.date);
    let d2 = 0;
    for (const k of Object.keys(n.signature)) {
      if (k === 'day') continue;
      const a = n.signature[k] ?? 0; const b = ref.signature[k] ?? 0;
      d2 += (a - b) * (a - b);
    }
    if (Math.sqrt(d2) < 0.12) violations.push({ nodeId: n.id, detail: `cosmetically close to canonical ${ref.id} (dist ${Math.sqrt(d2).toFixed(3)})` });
  }
  // long-horizon requirement: every family must have a node >120 days after its first
  const families = new Map<string, GenNode[]>();
  for (const n of nodes) if (n.branchFamily) families.set(n.branchFamily, [...(families.get(n.branchFamily) ?? []), n]);
  for (const [f, list] of families) {
    const span = Math.max(...list.map((n) => Date.parse(n.date))) - Math.min(...list.map((n) => Date.parse(n.date)));
    const hasLong = span > 120 * 86_400_000 || list.some((n) => n.trajectories.some((t) => t.longHorizon.length > 20));
    if (!hasLong) violations.push({ nodeId: `family_${f}`, detail: 'family lacks a long-horizon divergent continuation' });
  }
  return { critic: 'branch-diversity', violations };
}

/** 4. Physical/causal validity: legal map states, known controllers, sane values. */
export function physicalValidityCritic(nodes: GenNode[], actorIds: Set<string>): CriticReport {
  const violations: CriticReport['violations'] = [];
  const STATUSES = new Set(['normal', 'controlled', 'contested', 'buffer', 'demilitarized', 'evacuated', 'occupied', 'international', 'fragmented', 'collapsed']);
  for (const n of nodes) {
    for (const [region, st] of Object.entries(n.mapState)) {
      if (!STATUSES.has(st.status)) violations.push({ nodeId: n.id, detail: `illegal status ${st.status} for ${region}` });
      if (st.controller !== 'none' && !actorIds.has(st.controller)) violations.push({ nodeId: n.id, detail: `unknown controller ${st.controller}` });
    }
    for (const [k, v] of Object.entries(n.signature)) {
      if (!Number.isFinite(v) || v < -0.01 || v > 1.5) violations.push({ nodeId: n.id, detail: `signature ${k}=${v} out of range` });
    }
    if (n.confidence <= 0 || n.confidence > 1) violations.push({ nodeId: n.id, detail: `confidence out of range` });
    if (!n.trajectories.length && n.era !== 'extreme' && n.era !== 'canonical') violations.push({ nodeId: n.id, detail: 'branch node without trajectories' });
  }
  return { critic: 'physical-validity', violations };
}

/** 5. Commitment preservation: post-deal canonical nodes must carry the commitment. */
export function commitmentCritic(nodes: GenNode[]): CriticReport {
  const violations: CriticReport['violations'] = [];
  const checks = [
    { anchor: 'hostage_deal_1', after: '2023-11-22' },
    { anchor: 'lebanon_ceasefire', after: '2024-11-27' },
    { anchor: 'gaza_framework_oct25', after: '2025-10-10' },
  ];
  for (const n of nodes) {
    if (n.era !== 'canonical') continue;
    for (const c of checks) {
      if (Date.parse(n.date) > Date.parse(c.after) && !n.commitments.includes(`commitment:${c.anchor}`)) {
        violations.push({ nodeId: n.id, detail: `missing preserved commitment ${c.anchor}` });
      }
    }
  }
  return { critic: 'commitment-preservation', violations };
}

export function runAllCritics(nodes: GenNode[], actorIds: Set<string>): CriticReport[] {
  return [
    futureLeakageCritic(nodes),
    snapbackCritic(nodes),
    diversityCritic(nodes),
    physicalValidityCritic(nodes, actorIds),
    commitmentCritic(nodes),
  ];
}
