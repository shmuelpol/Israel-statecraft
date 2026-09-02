// Engine unit + property tests (acceptance matrix §2, §4).
import { describe, it, expect } from 'vitest';
import { Simulation, URGENCY_REAL_SECONDS } from '../engine/src/sim.js';
import { Rng } from '../engine/src/rng.js';
import { validateWorldPlan, validateScoreReport, type WorldContext } from '../engine/src/schema.js';
import { computeDivergence, anchorEligible } from '../engine/src/divergence.js';
import { SCENARIO } from '../scenarios/swords-of-iron/index.js';
import type { ReplayEntry, WorldPlan } from '../engine/src/types.js';

function makeSim(seed = 'test-seed') {
  const log: ReplayEntry[] = [];
  const sim = new Simulation(SCENARIO, 'r1', seed, { log: (e) => log.push(e) });
  return { sim, log };
}

const ctx: WorldContext = {
  metricIds: new Set(SCENARIO.metrics.map((m) => m.id)),
  hiddenVarIds: new Set(Object.keys(SCENARIO.hiddenVars).filter((k) => !k.startsWith('init_metric_'))),
  regionIds: new Set(SCENARIO.regions.map((r) => r.id)),
  actorIds: new Set(SCENARIO.actors.map((a) => a.id)),
};

function plan(partial: Partial<WorldPlan>): WorldPlan {
  return {
    id: 'p1', createdDay: 0, horizonDays: 15, trends: [], events: [], comms: [], mapChanges: [],
    optionUnlocks: [], optionClosures: [], actorDecisions: [],
    provenance: { nodeIds: [], mode: 'none', compatibility: 0 }, ...partial,
  };
}

describe('game clock', () => {
  it('advances monotonically and never pauses or reverses', () => {
    const { sim } = makeSim();
    let prev = sim.state.simDay;
    for (let i = 0; i < 100; i++) {
      sim.tick(250);
      expect(sim.state.simDay).toBeGreaterThan(prev);
      prev = sim.state.simDay;
    }
    expect(prev).toBeCloseTo(100 * 0.25 * SCENARIO.clock.daysPerSecond, 3);
  });

  it('ends exactly at the scenario end date and stops advancing', () => {
    const { sim } = makeSim();
    sim.tick(1e9);
    expect(sim.state.ended).toBe(true);
    const end = sim.state.simDay;
    sim.tick(10_000);
    expect(sim.state.simDay).toBe(end);
  });
});

describe('events', () => {
  const spec = {
    afterDays: 0,
    event: {
      type: 'test', titleHe: 'בדיקה', descHe: 'תיאור', sourceHe: 'מקור', urgency: 'urgent' as const,
      options: [{ id: 'a', labelHe: 'א', intent: 'x' }], allowFreeText: true,
      defaultResolver: 'israel_security', defaultIntent: 'default_measured', defaultResolutionHe: 'ברירת מחדל בוצעה.',
    },
  };

  it('expires unanswered events and triggers the default institutional action', () => {
    const { sim } = makeSim();
    let defaulted = 0;
    sim['hooks'].onDefaultAction = () => defaulted++;
    const ev = sim.spawnEvent(spec, 'p');
    const windowDays = URGENCY_REAL_SECONDS.urgent * SCENARIO.clock.daysPerSecond;
    sim.tick((windowDays / SCENARIO.clock.daysPerSecond) * 1000 + 500);
    expect(sim.state.events[ev.id].status).toBe('expired');
    expect(defaulted).toBe(1);
    // default resolution text entered the feed from the default resolver
    expect(sim.state.comms.some((c) => c.textHe === 'ברירת מחדל בוצעה.')).toBe(true);
  });

  it('typing grants a one-time grace without stopping time', () => {
    const { sim } = makeSim();
    const ev = sim.spawnEvent(spec, 'p');
    const before = sim.state.events[ev.id].expiresDay;
    const t0 = sim.state.simDay;
    sim.notifyTyping();
    expect(sim.state.simDay).toBe(t0); // typing itself doesn't move time...
    sim.tick(250);
    expect(sim.state.simDay).toBeGreaterThan(t0); // ...and time keeps flowing
    expect(sim.state.events[ev.id].expiresDay).toBeGreaterThan(before);
    const after1 = sim.state.events[ev.id].expiresDay;
    sim.notifyTyping(); // second grace attempt is ignored
    expect(sim.state.events[ev.id].expiresDay).toBe(after1);
  });

  it('marks messages late when their event resolved, but still accepts them', () => {
    const { sim } = makeSim();
    const ev = sim.spawnEvent(spec, 'p');
    sim.tick(60_000); // expire it
    const msg = sim.addPlayerMessage('תגובה מאוחרת', [], ev.id);
    expect(msg.late).toBe(true);
    expect(sim.state.playerMessages.length).toBe(1);
  });

  it('player text does not mutate world state directly', () => {
    const { sim } = makeSim();
    const metricsBefore = JSON.stringify(sim.state.metrics);
    const hiddenBefore = JSON.stringify(sim.state.hidden);
    sim.addPlayerMessage('העלה את כל המדדים למקסימום עכשיו', []);
    expect(JSON.stringify(sim.state.metrics)).toBe(metricsBefore);
    expect(JSON.stringify(sim.state.hidden)).toBe(hiddenBefore);
  });
});

describe('metrics & hidden variables', () => {
  it('hidden metrics keep operating causally after being hidden from UI', () => {
    const { sim } = makeSim();
    sim.setMetricVisibility('economy', false);
    expect(sim.state.metrics.economy.visible).toBe(false);
    const before = sim.state.metrics.economy.value;
    sim.applyPlan(plan({ trends: [{ metricId: 'economy', deltaPerDay: -2, days: 10, reason: 'test' }] }));
    sim.tick(4000); // 10 sim days
    expect(sim.state.metrics.economy.value).toBeLessThan(before);
  });

  it('clamps metric values to [0,100]', () => {
    const { sim } = makeSim();
    sim.applyPlan(plan({ trends: [{ metricId: 'economy', deltaPerDay: 10, days: 100, reason: 'test' }] }));
    sim.tick(200_000);
    expect(sim.state.metrics.economy.value).toBeLessThanOrEqual(100);
  });
});

describe('territory', () => {
  it('applies controller changes and rejects unknown regions safely', () => {
    const { sim } = makeSim();
    sim.applyMapChange({ afterDays: 0, regionId: 'gaza', controller: 'israel', status: 'occupied', intensity: 0.4 });
    expect(sim.state.regions.gaza.controller).toBe('israel');
    expect(sim.state.regions.gaza.status).toBe('occupied');
    sim.applyMapChange({ afterDays: 0, regionId: 'atlantis', controller: 'israel' });
    expect(sim.state.regions.atlantis).toBeUndefined();
  });

  it('golan is part of israel geometry: no separate golan region exists', () => {
    expect(SCENARIO.regions.find((r) => r.id.includes('golan'))).toBeUndefined();
    expect(SCENARIO.regions.find((r) => r.id === 'west_bank')).toBeDefined();
  });
});

describe('seeded randomness & replay', () => {
  it('same seed and draw order produce identical values; draws are recorded', () => {
    const a = new Rng('s1'); const b = new Rng('s1');
    const va = [a.uniform('x', 'j'), a.range('y', 0, 10, 'j'), a.bernoulli('z', 0.5, 'j') ? 1 : 0];
    const vb = [b.uniform('x', 'j'), b.range('y', 0, 10, 'j'), b.bernoulli('z', 0.5, 'j') ? 1 : 0];
    expect(va).toEqual(vb);
    expect(a.draws.length).toBe(3);
    expect(a.draws[0].lineage).toContain('s1:x:1');
  });

  it('replay mode reuses recorded values and refuses mismatched draw order', () => {
    const a = new Rng('s2');
    a.range('roll', 0, 100, 'j');
    const rec = [...a.draws];
    const b = new Rng('DIFFERENT-SEED');
    b.useRecorded(rec);
    expect(b.range('roll', 0, 100, 'j')).toBe(rec[0].value);
    const c = new Rng('s2');
    c.useRecorded(rec);
    expect(() => c.uniform('other-name', 'j')).toThrow(/mismatch/);
  });
});

describe('schema validation (malformed AI output is rejected)', () => {
  it('accepts a well-formed plan', () => {
    expect(validateWorldPlan(plan({}), ctx).ok).toBe(true);
  });
  it('rejects unknown metric, missing provenance, and predicted-delta leakage', () => {
    expect(validateWorldPlan(plan({ trends: [{ metricId: 'nope', deltaPerDay: 1, days: 5, reason: 'x' }] }), ctx).ok).toBe(false);
    const noProv = { ...plan({}), provenance: undefined } as unknown;
    expect(validateWorldPlan(noProv, ctx).ok).toBe(false);
    const leaky = plan({
      events: [{ afterDays: 0, event: {
        type: 't', titleHe: 'אירוע', descHe: 'ההשפעה: +12% לכלכלה', sourceHe: 'מ', urgency: 'urgent',
        options: [], allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'd',
      } }],
    });
    expect(validateWorldPlan(leaky, ctx).ok).toBe(false);
  });
  it('rejects a malformed score report', () => {
    expect(validateScoreReport({ composite: 200 }).ok).toBe(false);
  });
});

describe('divergence & anchors', () => {
  it('anchors lose eligibility when prerequisites break (no hidden snapback)', () => {
    const { sim } = makeSim();
    const nasrallah = SCENARIO.canonicalTimeline.find((a) => a.id === 'nasrallah_killed')!;
    // prerequisite pager_operation not fired yet:
    expect(anchorEligible(nasrallah, sim.state).eligible).toBe(false);
    sim.state.anchorsFired.push('pager_operation');
    sim.state.actors.hezbollah.leadership.alive = true;
    expect(anchorEligible(nasrallah, sim.state).eligible).toBe(true);
    sim.state.actors.hezbollah.leadership.alive = false;
    expect(anchorEligible(nasrallah, sim.state).eligible).toBe(false);
  });

  it('high divergence removes historical privilege entirely', () => {
    const { sim } = makeSim();
    sim.state.anchorsFired.push('oct7_attack');
    sim.state.divergence = { dims: {}, aggregate: 0.7, level: 'high' };
    const deal = SCENARIO.canonicalTimeline.find((a) => a.id === 'hostage_deal_1')!;
    sim.state.hostages.living = 240;
    expect(anchorEligible(deal, sim.state).eligible).toBe(false);
  });

  it('missed and suppressed anchors raise divergence dims', () => {
    const { sim } = makeSim();
    sim.state.simDay = 500;
    // no war ever started: only the missed opening contributes (war-driven history is pending)
    const d1 = computeDivergence(sim.state, SCENARIO.canonicalTimeline, 'oct7_attack');
    expect(d1.level).not.toBe('low');
    // war started on schedule but NOTHING else happened → deeply divergent
    sim.state.counters.oct7Day = 8;
    sim.state.anchorsFired.push('oct7_attack');
    const d2 = computeDivergence(sim.state, SCENARIO.canonicalTimeline, 'oct7_attack');
    expect(d2.aggregate).toBeGreaterThan(0.3);
    expect(d2.level).not.toBe('low');
  });
});

describe('office & policies', () => {
  it('losing office expires open events and enters observer mode; return is possible', () => {
    const { sim } = makeSim();
    sim.spawnEvent({
      afterDays: 0,
      event: {
        type: 'x', titleHe: 'א', descHe: 'ב', sourceHe: 'ג', urgency: 'window',
        options: [], allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'd',
      },
    }, 'p');
    sim.loseOffice('בדיקה');
    expect(sim.state.office.inOffice).toBe(false);
    expect(sim.state.office.observer).toBe(true);
    expect(Object.values(sim.state.events).every((e) => e.status !== 'active')).toBe(true);
    sim.returnToOffice('בדיקה');
    expect(sim.state.office.inOffice).toBe(true);
  });

  it('standing policies persist and can be cancelled by topic', () => {
    const { sim } = makeSim();
    sim.addStandingPolicy('כוננות מוגברת בצפון', 'north');
    expect(sim.state.standingPolicies.filter((p) => p.active).length).toBe(1);
    expect(sim.cancelStandingPolicy('north')).toBe(true);
    expect(sim.state.standingPolicies.filter((p) => p.active).length).toBe(0);
  });

  it('attention decays over time', () => {
    const { sim } = makeSim();
    sim.bumpAttention('iran', 0.8);
    sim.tick(40_000); // 100 sim days
    expect(sim.state.attention.iran).toBeLessThan(0.1);
  });
});
