// Alternative-history tests (acceptance §6): the world must remain causally
// alternative — no snapback to real history without its causes.
import { describe, it, expect } from 'vitest';
import { newRun, playHeadless, historicalScript, passiveScript, type PolicyScript } from './harness.js';

function stepDays(run: ReturnType<typeof newRun>, days: number, stepMs = 500) {
  const target = run.sim.state.simDay + days;
  let guard = 0;
  while (run.sim.state.simDay < target && !run.sim.state.ended && guard++ < 200000) run.step(stepMs);
}

/** answers every event by refusing deals and covert ops — a "decliner" PM */
const declineScript: PolicyScript = {
  name: 'decliner',
  onEvent: (run, id) => {
    const ev = run.sim.state.events[id];
    const opt = ev?.options.find((o) => ['reject_deal', 'decline_covert', 'order_contain', 'order_no_retaliation', 'order_restraint'].includes(o.intent));
    return opt ? { optionId: opt.id } : null;
  },
};

describe('§6.3 no Syrian collapse when Hezbollah stays strong', () => {
  it('declining the pager operation keeps Hezbollah strong and suppresses Assad collapse', () => {
    const run = newRun('no-syria-collapse');
    const script: PolicyScript = {
      name: 'no-north-campaign',
      onEvent: (r, id) => {
        const ev = r.sim.state.events[id];
        if (!ev) return null;
        // decline all covert windows in the north; otherwise act historically
        if (ev.type === 'covert_window' || ev.type === 'decapitation') {
          const no = ev.options.find((o) => o.intent === 'decline_covert');
          return no ? { optionId: no.id } : null;
        }
        return historicalScript.onEvent!(r, id, ev.options, ev.type, ev.titleHe);
      },
    };
    playHeadless(run, script, 470); // run past Dec 2024
    const s = run.sim.state;
    expect(s.anchorsFired).not.toContain('pager_operation');
    expect(s.anchorsFired).not.toContain('nasrallah_killed');
    expect(s.hidden.hezbollah_strength).toBeGreaterThan(55);
    expect(s.anchorsFired).not.toContain('assad_collapse');
    expect(s.anchorsSuppressed).toContain('assad_collapse');
    // and the June-2025 campaign prerequisites are gone too — no snapback
    expect(s.anchorsFired).not.toContain('iran_war_june25');
  }, 120_000);
});

describe('§6.5 early Iran strike: uncertainty is real, later knowledge absent', () => {
  it('an early campaign order can fail or succeed; no automatic June-2025 outcome', () => {
    const outcomes = new Set<string>();
    for (const seed of ['early-iran-1', 'early-iran-2', 'early-iran-3', 'early-iran-4', 'early-iran-5', 'early-iran-6']) {
      const run = newRun(seed);
      stepDays(run, 20); // war open
      run.handleMessage('פתח במערכה רחבה נגד איראן עכשיו', []);
      stepDays(run, 20);
      const success = run.sim.state.comms.some((c) => c.textHe.includes('נפתחה בהצלחה'));
      const failure = run.sim.state.comms.some((c) => c.textHe.includes('אבדנו מטוסים'));
      if (success) outcomes.add('success');
      if (failure) outcomes.add('failure');
    }
    // across seeds both branches of the plausible envelope must be reachable
    expect(outcomes.size).toBeGreaterThanOrEqual(2);
  }, 120_000);
});

describe('§6.6 hostage-first settlement', () => {
  it('early deals return hostages, preserve Hamas, and raise enemy confidence — consequences, not a verdict', () => {
    const run = newRun('hostage-first');
    const script: PolicyScript = {
      name: 'hostage-first',
      onEvent: (r, id) => {
        const ev = r.sim.state.events[id];
        if (!ev) return null;
        const accept = ev.options.find((o) => ['accept_deal', 'order_hostages_first', 'open_negotiation'].includes(o.intent));
        if (accept) return { optionId: accept.id };
        // a hostage-first PM also avoids escalatory pressure elsewhere
        const restrained = ev.options.find((o) => ['order_contain', 'order_restraint', 'order_no_retaliation', 'order_delay_ground', 'order_delay_rafah', 'order_gaza_first', 'order_measured_response', 'decline_covert'].includes(o.intent));
        return restrained ? { optionId: restrained.id } : { optionId: ev.options[0]?.id ?? '' };
      },
    };
    playHeadless(run, script, 500);
    const s = run.sim.state;
    expect(s.hostages.returnedAlive).toBeGreaterThan(80);
    expect(s.hidden.hamas_strength).toBeGreaterThan(20); // organization survives
    expect(s.ended || s.simDay >= 500).toBe(true);
  }, 120_000);
});

describe('§6.8 US rupture', () => {
  it('repeated refusals degrade supply without a generic game-over', () => {
    const run = newRun('us-rupture');
    stepDays(run, 20);
    run.sim.state.metrics.us_relations.value = 30; // strained by policy
    for (let i = 0; i < 3; i++) {
      const ev = Object.values(run.sim.state.events).find((e) => e.status === 'active' && e.templateId === 'us_pressure_call');
      if (ev) {
        const refuse = ev.options.find((o) => o.intent === 'refuse_usa')!;
        run.handleMessage('', [], ev.id, refuse.id);
      }
      stepDays(run, 45);
    }
    const s = run.sim.state;
    expect(s.counters.usRefusals ?? 0).toBeGreaterThanOrEqual(1);
    expect(s.ended).toBe(false); // no instant game over
    expect(s.metrics.us_relations.value).toBeLessThan(40);
  }, 60_000);
});

describe('§6.9 nuclear threshold is not an end screen', () => {
  it('iran_nuclear at maximum changes the world but the run continues', () => {
    const run = newRun('nuclear-threshold');
    stepDays(run, 20);
    run.sim.state.metrics.iran_nuclear.value = 95;
    run.sim.state.hidden.iran_nuclear_progress = 95;
    stepDays(run, 60);
    expect(run.sim.state.ended).toBe(false);
    // and the final report warns about it
    const res = playHeadless(run, { name: 'continue' });
    if (res.run.sim.state.hidden.iran_nuclear_progress > 70) {
      expect(res.score!.longTermWarningsHe.join(' ')).toContain('גרעין');
    }
  }, 120_000);
});

describe('§6.11 observer mode + return campaign', () => {
  it('persistent public activity builds momentum; return is uncertain, not a button', () => {
    const run = newRun('return-campaign');
    stepDays(run, 15);
    run.sim.loseOffice('בדיקת מצב צופה');
    const before = run.sim.state.office.returnMomentum;
    for (let i = 0; i < 10; i++) {
      run.handleMessage('הצהרה פומבית: הממשלה הזו נכשלת. אני מציע דרך אחרת.', []);
      stepDays(run, 20);
    }
    const s = run.sim.state;
    expect(before).toBe(0);
    // momentum accumulated (or was spent on a comeback attempt that already succeeded)
    expect(s.office.returnMomentum > 0 || s.office.inOffice).toBe(true);
    // no visible influence meter leaks to the client
    expect(JSON.stringify(run.view())).not.toContain('returnMomentum');
  }, 60_000);
});

describe('determinism: identical seed + inputs → identical logs', () => {
  it('two headless runs with the same seed produce byte-identical draw sequences and hashes', () => {
    const mk = () => {
      const run = newRun('determinism-seed');
      const script: PolicyScript = {
        name: 'fixed',
        onEvent: (r, id) => ({ optionId: r.sim.state.events[id]?.options[0]?.id ?? '' }),
        periodic: (r, day) => { if (day > 100 && day < 140) r.handleMessage('מה מצב הכלכלה?', []); },
      };
      return playHeadless(run, script, 400, 500);
    };
    const a = mk();
    const b = mk();
    const drawsA = a.run.entries.filter((e) => e.type === 'draw').map((e) => JSON.stringify(e.payload));
    const drawsB = b.run.entries.filter((e) => e.type === 'draw').map((e) => JSON.stringify(e.payload));
    expect(drawsA).toEqual(drawsB);
    const hashesA = a.run.entries.filter((e) => e.stateHash !== undefined).map((e) => e.stateHash);
    const hashesB = b.run.entries.filter((e) => e.stateHash !== undefined).map((e) => e.stateHash);
    expect(hashesA).toEqual(hashesB);
  }, 120_000);
});

describe('axis agency — enemies act on THIS run, not on history', () => {
  it('total passivity drives the axis to the destruction basin (not a replay of real history)', () => {
    const run = newRun('axis-passivity');
    playHeadless(run, passiveScript, 1200, 500);
    const s = run.sim.state;
    // the PM approved nothing: no Israeli offensive may be credited
    expect(s.counters.israeliOffensives ?? 0).toBe(0);
    // enemies escalate on weakness through every stage
    expect(s.counters.axisSecondWave).toBeTruthy();
    expect(s.counters.axisHezbollahEntry).toBeTruthy();
    expect(s.counters.axisIranSprint).toBeTruthy();
    expect(s.counters.axisIranDemo).toBeTruthy();
    expect(s.counters.axisCoordinatedAssault).toBeTruthy();
    expect(s.hidden.enemy_confidence).toBeGreaterThan(80);
    expect(s.hidden.iran_nuclear_progress).toBeGreaterThan(90);
    // and Israeli historical achievements never happen without the PM
    for (const gone of ['ground_op_north_gaza', 'rafah_op', 'pager_operation', 'nasrallah_killed', 'iran_war_june25']) {
      expect(s.anchorsFired).not.toContain(gone);
    }
    expect(run.score!.composite).toBeLessThan(25);
  }, 120_000);

  it('an anchor that was suppressed can never fire later', () => {
    const run = newRun('axis-no-resurrect');
    playHeadless(run, passiveScript, 1200, 500);
    const s = run.sim.state;
    for (const id of s.anchorsSuppressed) expect(s.anchorsFired).not.toContain(id);
  }, 120_000);
});
