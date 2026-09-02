// Atlas pipeline + retrieval tests (acceptance §8 and Atlas quality checks).
import { describe, it, expect } from 'vitest';
import { generateAtlas } from '../atlas/src/generate.js';
import { runAllCritics, futureLeakageCritic, snapbackCritic } from '../atlas/src/critics.js';
import { retrieveNodes, stateSignature } from '../ai/src/retrieval.js';
import { ACTORS } from '../scenarios/swords-of-iron/actors.js';
import { SCENARIO } from '../scenarios/swords-of-iron/index.js';
import { Simulation } from '../engine/src/sim.js';
import type { AtlasNode } from '../engine/src/types.js';

const nodes = generateAtlas();
const actorIds = new Set(ACTORS.map((a) => a.id));

describe('atlas generation', () => {
  it('produces a substantial atlas: 100+ nodes, all families, all extreme states', () => {
    expect(nodes.length).toBeGreaterThanOrEqual(100);
    for (const f of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      expect(nodes.some((n) => n.branchFamily === f)).toBe(true);
    }
    expect(nodes.filter((n) => n.era === 'extreme').length).toBe(22);
  });

  it('every node carries the required epistemic schema fields', () => {
    for (const n of nodes) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.groundTruth.length).toBeGreaterThan(0);
      expect(Object.keys(n.actorBeliefs).length).toBeGreaterThan(0);
      expect(Object.keys(n.knownUnknowns).length).toBeGreaterThan(0);
      expect(n.openOptions).toBeDefined();
      expect(n.latentOptions).toBeDefined();
      expect(n.closedOptions).toBeDefined();
      expect(n.whoBenefitsFromTime.length).toBeGreaterThan(0);
      expect(n.confidence).toBeGreaterThan(0);
      expect(n.sources.length).toBeGreaterThan(0);
    }
  });

  it('all critics pass on the shipped atlas (snapback rate 0)', () => {
    const reports = runAllCritics(nodes, actorIds);
    for (const r of reports) {
      expect(r.violations, `${r.critic}: ${JSON.stringify(r.violations.slice(0, 3))}`).toHaveLength(0);
    }
  });

  it('future-leakage critic actually catches leaks (negative control)', () => {
    const poisoned = JSON.parse(JSON.stringify(nodes[0])) as AtlasNode;
    poisoned.date = '2023-10-01';
    poisoned.groundTruth.push('the Mojtaba succession changes everything');
    const rep = futureLeakageCritic([poisoned]);
    expect(rep.violations.length).toBeGreaterThan(0);
  });

  it('snapback critic catches a branch that expects its removed anchor (negative control)', () => {
    const bad = JSON.parse(JSON.stringify(nodes.find((n) => n.branchFamily === 'F')!)) as AtlasNode & { removedAnchors?: string[] };
    bad.expectedDevelopments = [...bad.expectedDevelopments, 'anchor:assad_collapse arrives on schedule anyway'];
    const rep = snapbackCritic([bad]);
    expect(rep.violations.length).toBeGreaterThan(0);
  });
});

describe('atlas retrieval', () => {
  function simAt(mut?: (s: Simulation) => void): Simulation {
    const sim = new Simulation(SCENARIO, 'r', 's', { log: () => undefined });
    mut?.(sim);
    return sim;
  }

  it('retrieves several nearby nodes for the opening state', () => {
    const sim = simAt();
    const hits = retrieveNodes({ version: 'v', nodes }, sim.state, 4);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(4);
    expect(hits[0].compatibility).toBeGreaterThan(0.3);
  });

  it('run facts hard-disqualify contradictory nodes regardless of similarity', () => {
    const sim = simAt((s) => {
      s.state.simDay = 430; // Dec 2024 era
      s.state.hidden.hezbollah_strength = 80; // Hezbollah NOT weakened in this run
    });
    const hits = retrieveNodes({ version: 'v', nodes }, sim.state, 8);
    // family F node (assad survives behind strong hezbollah) requires strength>=56 — eligible.
    // Nothing retrieved may carry a prerequisite that contradicts run facts:
    for (const h of hits) {
      for (const p of h.node.prerequisites) {
        if (p.kind === 'hiddenVarMin') expect(sim.state.hidden[p.varId]).toBeGreaterThanOrEqual(p.min);
        if (p.kind === 'hiddenVarMax') expect(sim.state.hidden[p.varId]).toBeLessThanOrEqual(p.max);
      }
    }
  });

  it('signature reflects hostages, escalation and office state', () => {
    const sim = simAt((s) => {
      s.state.hostages.living = 100;
      s.state.office.inOffice = false;
    });
    const sig = stateSignature(sim.state);
    // 100 living set by the test + 2 pre-war bodies held in the initial state
    expect(sig.hostages_held).toBeCloseTo(102 / 250, 3);
    expect(sig.in_office).toBe(0);
  });
});
