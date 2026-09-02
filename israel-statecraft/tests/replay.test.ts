// Replay tests: fold(recorded log) reproduces the run, zero model calls.
import { describe, it, expect, vi } from 'vitest';
import { foldReplay, assertNoModelCallsInReplay } from '../engine/src/replay.js';
import { newRun, playHeadless, historicalScript } from './harness.js';

describe('replay', () => {
  it('folding the log reproduces final metrics, office changes, context selections and score', () => {
    const run = newRun('replay-fold');
    run.handleContext(['region:gaza', 'metric:hostages_metric']);
    const res = playHeadless(run, historicalScript);
    const data = foldReplay(run.entries);
    expect(data.meta.runId).toBe(run.runId);
    expect(data.meta.seed).toBe('replay-fold');
    // last metrics snapshot in fold matches live state (within snapshot rounding)
    const lastMetrics = [...data.frames].reverse().find((f) => f.metrics)!.metrics!;
    for (const [k, v] of Object.entries(lastMetrics)) {
      expect(Math.abs(run.sim.state.metrics[k].value - v)).toBeLessThan(2.5);
    }
    // context selection replays
    expect(data.frames.some((f) => f.contextSelect?.includes('region:gaza'))).toBe(true);
    // versions recorded (scenario/atlas/prompts/engine/models/provider)
    const versions = data.meta.versions as Record<string, unknown>;
    expect(versions.scenario).toContain('swords-of-iron');
    expect(versions.atlas).toContain('atlas@');
    expect(versions.prompts).toContain('prompts@');
    // score frame exists and matches
    const scoreFrame = data.frames.find((f) => f.score);
    expect(scoreFrame?.score?.composite).toBe(res.score!.composite);
    // decision audit exists with actor-language provenance and no chain-of-thought fields
    expect(data.audit.length).toBeGreaterThan(5);
    const auditJson = JSON.stringify(data.audit);
    expect(auditJson).toContain('promptRef');
    expect(auditJson).not.toMatch(/chainOfThought|thinking|scratchpad/);
    // all draws recorded
    expect(data.draws.length).toBeGreaterThan(10);
    for (const d of data.draws) {
      expect(d.lineage).toBeTruthy();
      expect(d.justification).toBeTruthy();
    }
  }, 180_000);

  it('replay makes zero network/model calls', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const run = newRun('replay-nonet');
    playHeadless(run, historicalScript, 200);
    foldReplay(run.entries);
    assertNoModelCallsInReplay(spy.mock.calls.length);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }, 120_000);

  it('no deceased leader acts after death without succession (property)', () => {
    const run = newRun('leader-prop');
    playHeadless(run, historicalScript, 500);
    const s = run.sim.state;
    // Nasrallah killed → leadership replaced, org may still act under successor
    if (s.anchorsFired.includes('nasrallah_killed')) {
      expect(s.actors.hezbollah.leadership.leaderName).not.toBe('حسن نصر الله');
      expect(s.actors.hezbollah.leadership.sinceDay).toBeGreaterThan(0);
    }
  }, 120_000);

  it('returned hostages never become captive again (property)', () => {
    const run = newRun('hostage-prop');
    playHeadless(run, historicalScript);
    let lastHeld = Infinity;
    let taken = 0;
    for (const e of run.entries) {
      if (e.type === 'metrics_snapshot') {
        const h = (e.payload as { hostages: { living: number; deceasedHeld: number; totalTaken: number } }).hostages;
        const held = h.living + h.deceasedHeld;
        if (h.totalTaken === taken) {
          expect(held).toBeLessThanOrEqual(lastHeld + 0.001);
        }
        taken = h.totalTaken;
        lastHeld = held;
      }
    }
  }, 180_000);
});
