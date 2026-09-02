// Deterministic real-time simulation core.
// The clock never waits for anything. AI plans are applied between ticks after
// validation. Every state mutation flows through this module and is logged.

import type {
  GameState, ScenarioPackage, WorldPlan, ActionableEvent, PlayerMessage,
  CommMessage, ReplayEntry, ReplayEntryType, ScheduledEventSpec, MapChange,
  TrendEffect, Urgency, DirectorMessage, StandingPolicy, Commitment, DynamicMechanic,
} from './types.js';
import { Rng } from './rng.js';
import { clamp, fnv1a, stableStringify, uid, dayToIso } from './util.js';

export const ENGINE_VERSION = '1.0.0';

/** Real-seconds windows per urgency category, converted to sim days at runtime.
 *  Playtest-calibrated: players need time to read Hebrew card text and think. */
export const URGENCY_REAL_SECONDS: Record<Urgency, number> = { immediate: 25, urgent: 40, window: 60 };

interface ScheduledItem {
  day: number;
  kind: 'event' | 'comm' | 'map';
  event?: ScheduledEventSpec;
  comm?: { msg: Omit<CommMessage, 'id' | 'simDay'> };
  map?: MapChange;
  planId: string;
}

interface ActiveTrend extends TrendEffect { startDay: number; planId: string }

export interface SimHooks {
  log: (e: ReplayEntry) => void;
  /** called when an event expires unanswered so the AI layer adjudicates the default action */
  onDefaultAction?: (ev: ActionableEvent) => void;
}

export class Simulation {
  state: GameState;
  rng: Rng;
  private seq = 0;
  private schedule: ScheduledItem[] = [];
  private trends: ActiveTrend[] = [];
  private lastSnapshotDay = -999;
  private hooks: SimHooks;

  constructor(scenario: ScenarioPackage, runId: string, seed: string, hooks: SimHooks, versionsExtra: Record<string, string> = {}, provider = 'mock') {
    this.hooks = hooks;
    this.rng = new Rng(seed);
    this.rng.onDraw = (d) => this.log('draw', d);
    this.state = buildInitialState(scenario, runId, seed, provider, versionsExtra);
    this.log('run_start', { runId, seed, versions: this.state.versions, startDate: scenario.clock.startDate });
  }

  // ------------------------------------------------------------- logging

  private log(type: ReplayEntryType, payload: unknown, withHash = false): void {
    const e: ReplayEntry = {
      seq: this.seq++,
      simDay: this.state.simDay,
      realTs: 0, // filled by server layer for wall-clock audit; deterministic core ignores it
      type,
      payload,
    };
    if (withHash) e.stateHash = this.stateHash();
    this.hooks.log(e);
  }

  stateHash(): number {
    const s = this.state;
    return fnv1a(stableStringify({
      d: Math.round(s.simDay * 100) / 100,
      m: Object.fromEntries(Object.entries(s.metrics).map(([k, v]) => [k, Math.round(v.value * 100) / 100])),
      h: Object.fromEntries(Object.entries(s.hidden).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      r: Object.fromEntries(Object.entries(s.regions).map(([k, v]) => [k, v.controller + ':' + v.status])),
      o: s.office.inOffice,
      hs: s.hostages,
    }));
  }

  // ------------------------------------------------------------- tick

  /** Advance the world by dtMs of real time. Never blocks, never pauses. */
  tick(dtMs: number): void {
    if (this.state.ended) return;
    const days = (dtMs / 1000) * this.state.clock.daysPerSecond;
    const from = this.state.simDay;
    this.state.simDay = from + days;
    const now = this.state.simDay;

    // apply active trends
    for (const t of this.trends) {
      if (now < t.startDay || from > t.startDay + t.days) continue;
      const effDays = Math.min(now, t.startDay + t.days) - Math.max(from, t.startDay);
      if (effDays <= 0) continue;
      const delta = t.deltaPerDay * effDays;
      if (t.metricId) {
        const m = this.state.metrics[t.metricId];
        if (m) { m.value = clamp(m.value + delta); m.trend = m.trend * 0.9 + t.deltaPerDay * 0.1; }
      } else if (t.hiddenVar) {
        this.state.hidden[t.hiddenVar] = clamp((this.state.hidden[t.hiddenVar] ?? 50) + delta);
      }
    }
    this.trends = this.trends.filter((t) => now <= t.startDay + t.days);

    // dynamic mechanics of type rule/metric: apply their outputs as micro-trends
    for (const mech of this.state.dynamicMechanics) {
      for (const out of mech.outputs) {
        const gate = mech.inputs.every((i) => (this.state.hidden[i] ?? this.state.metrics[i]?.value ?? 0) > 5);
        if (!gate) continue;
        const delta = out.deltaPerDay * days;
        if (out.metricId && this.state.metrics[out.metricId]) {
          this.state.metrics[out.metricId].value = clamp(this.state.metrics[out.metricId].value + delta);
        } else if (out.hiddenVar) {
          this.state.hidden[out.hiddenVar] = clamp((this.state.hidden[out.hiddenVar] ?? 50) + delta);
        }
      }
    }

    // attention decay (~3%/sim-day toward 0)
    for (const k of Object.keys(this.state.attention)) {
      this.state.attention[k] = Math.max(0, this.state.attention[k] - 0.03 * days * this.state.attention[k]);
    }
    // actor memory salience decay
    for (const a of Object.values(this.state.actors)) {
      for (const m of a.memory) m.salience = Math.max(0.05, m.salience - 0.002 * days);
    }

    // scheduled items whose time arrived
    const due = this.schedule.filter((s) => s.day <= now);
    this.schedule = this.schedule.filter((s) => s.day > now);
    for (const item of due) this.fire(item);

    // event expiry
    for (const ev of Object.values(this.state.events)) {
      if (ev.status === 'active' && now >= ev.expiresDay) {
        ev.status = 'expired';
        this.log('event_expired', { id: ev.id, titleHe: ev.titleHe });
        if (ev.defaultResolutionHe) {
          this.pushComm({
            senderId: ev.defaultResolver, senderHe: this.actorNameHe(ev.defaultResolver),
            kind: 'internal', textHe: ev.defaultResolutionHe, eventId: ev.id, regionId: ev.regionId,
          });
        }
        this.hooks.onDefaultAction?.(ev);
      }
    }

    // stale queued player messages referencing resolved events become late
    for (const pm of this.state.playerMessages) {
      if (pm.status === 'queued' && pm.eventId) {
        const ev = this.state.events[pm.eventId];
        if (ev && ev.status !== 'active') pm.late = true;
      }
    }

    // periodic metric snapshot for replay verification
    if (now - this.lastSnapshotDay >= 7) {
      this.lastSnapshotDay = now;
      this.log('metrics_snapshot', {
        metrics: Object.fromEntries(Object.entries(this.state.metrics).map(([k, v]) => [k, Math.round(v.value * 10) / 10])),
        hidden: Object.fromEntries(Object.entries(this.state.hidden).map(([k, v]) => [k, Math.round(v * 10) / 10])),
        hostages: { ...this.state.hostages },
        attention: Object.fromEntries(Object.entries(this.state.attention).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      }, true);
    }

    // end of scenario
    const endDay = this.totalDays();
    if (now >= endDay) {
      this.state.simDay = endDay;
      this.state.ended = true;
      this.log('run_end', { endDate: this.state.clock.endDate }, true);
    }
  }

  totalDays(): number {
    return (Date.parse(this.state.clock.endDate) - Date.parse(this.state.clock.startDate)) / 86_400_000;
  }

  currentDateIso(): string {
    return dayToIso(this.state.clock.startDate, this.state.simDay);
  }

  private fire(item: ScheduledItem): void {
    if (item.kind === 'event' && item.event) {
      const spec = item.event;
      if (spec.probability !== undefined && spec.probability < 1) {
        const happens = this.rng.bernoulli(spec.drawName ?? `event:${spec.event.type}`, spec.probability, `scheduled event ${spec.event.type}`);
        if (!happens) return;
      }
      this.spawnEvent(spec, item.planId);
    } else if (item.kind === 'comm' && item.comm) {
      this.pushComm(item.comm.msg);
    } else if (item.kind === 'map' && item.map) {
      this.applyMapChange(item.map);
    }
  }

  // ------------------------------------------------------------- events

  spawnEvent(spec: ScheduledEventSpec, planId: string): ActionableEvent {
    const id = uid('ev', this.state.counters.event = (this.state.counters.event ?? 0) + 1);
    const windowSec = spec.durationDays !== undefined
      ? spec.durationDays / this.state.clock.daysPerSecond
      : URGENCY_REAL_SECONDS[spec.event.urgency];
    const durDays = windowSec * this.state.clock.daysPerSecond;
    const ev: ActionableEvent = {
      ...spec.event,
      id,
      createdDay: this.state.simDay,
      expiresDay: this.state.simDay + durDays,
      graceUsed: false,
      status: 'active',
    };
    this.state.events[id] = ev;
    this.log('event_spawned', { ...ev, planId });
    return ev;
  }

  /** Player picked a predefined option or free-text on an event. */
  answerEvent(eventId: string, optionId: string | undefined, messageId: string | undefined): boolean {
    const ev = this.state.events[eventId];
    if (!ev || ev.status !== 'active') return false;
    ev.status = 'answered';
    this.log('event_answered', { eventId, optionId, messageId });
    return true;
  }

  resolveEvent(eventId: string): void {
    const ev = this.state.events[eventId];
    if (!ev) return;
    ev.status = 'resolved';
    this.log('event_resolved', { eventId });
  }

  /** Typing engages leadership: one-time grace per event; time itself never stops. */
  notifyTyping(): void {
    for (const ev of Object.values(this.state.events)) {
      if (ev.status === 'active' && !ev.graceUsed) {
        const remaining = ev.expiresDay - this.state.simDay;
        if (remaining > 0) {
          const graceCapDays = 12 * this.state.clock.daysPerSecond; // max 12 real seconds
          ev.expiresDay += Math.min(remaining * 0.5, graceCapDays);
          ev.graceUsed = true;
        }
      }
    }
  }

  // ------------------------------------------------------------- player IO

  addPlayerMessage(text: string, contextIds: string[], eventId?: string, optionId?: string): PlayerMessage {
    const id = uid('pm', this.state.counters.pmsg = (this.state.counters.pmsg ?? 0) + 1);
    const ev = eventId ? this.state.events[eventId] : undefined;
    const msg: PlayerMessage = {
      id, text, simDay: this.state.simDay, realTs: 0,
      contextIds: [...contextIds], eventId, optionId,
      status: 'queued', late: !!(ev && ev.status !== 'active'),
    };
    this.state.playerMessages.push(msg);
    this.log('player_msg', msg);
    if (eventId && ev && ev.status === 'active' && (optionId || text)) this.answerEvent(eventId, optionId, id);
    return msg;
  }

  routeMessage(id: string, intent: PlayerMessage['intent'], targetId: string | undefined, blockedReasonHe?: string): void {
    const m = this.state.playerMessages.find((x) => x.id === id);
    if (!m) return;
    if (blockedReasonHe) {
      m.status = 'blocked';
      m.blockedReasonHe = blockedReasonHe;
      this.log('injection_blocked', { id, text: m.text.slice(0, 200), reasonHe: blockedReasonHe });
      return;
    }
    m.intent = intent;
    m.targetId = targetId;
    m.status = 'processing';
    this.log('msg_routed', { id, intent, targetId, late: m.late });
  }

  answerMessage(id: string): void {
    const m = this.state.playerMessages.find((x) => x.id === id);
    if (m) m.status = m.late ? 'stale' : 'answered';
  }

  pushComm(msg: Omit<CommMessage, 'id' | 'simDay'>): CommMessage {
    const id = uid('cm', this.state.counters.comm = (this.state.counters.comm ?? 0) + 1);
    const full: CommMessage = { ...msg, id, simDay: this.state.simDay };
    this.state.comms.push(full);
    this.log('comm', full);
    return full;
  }

  pushDirectorMsg(from: DirectorMessage['from'], textHe: string, kind?: DirectorMessage['kind']): DirectorMessage {
    const id = uid('dm', this.state.counters.dmsg = (this.state.counters.dmsg ?? 0) + 1);
    const m: DirectorMessage = { id, simDay: this.state.simDay, from, textHe, kind };
    this.state.directorChat.push(m);
    this.log('director_msg', m);
    return m;
  }

  recordContextSelect(ids: string[]): void {
    this.log('context_select', { ids });
  }

  /** AI-call latency accounting (live modes); replay ignores these entries. */
  pushLatency(info: { source: string; kind: string; ms: number; ok: boolean; error?: string }): void {
    this.log('latency', info);
  }

  // ------------------------------------------------------------- policies, commitments, attention

  addStandingPolicy(textHe: string, topic: string): StandingPolicy {
    const id = uid('sp', this.state.counters.policy = (this.state.counters.policy ?? 0) + 1);
    const p: StandingPolicy = { id, textHe, topic, createdDay: this.state.simDay, active: true };
    this.state.standingPolicies.push(p);
    this.log('policy_change', { op: 'add', policy: p });
    return p;
  }

  cancelStandingPolicy(idOrTopic: string): boolean {
    const p = this.state.standingPolicies.find((x) => x.active && (x.id === idOrTopic || x.topic === idOrTopic));
    if (!p) return false;
    p.active = false;
    this.log('policy_change', { op: 'cancel', id: p.id });
    return true;
  }

  addCommitment(c: Omit<Commitment, 'id'>): Commitment {
    const id = uid('ct', this.state.counters.commit = (this.state.counters.commit ?? 0) + 1);
    const full: Commitment = { ...c, id };
    this.state.commitments.push(full);
    this.log('commitment', full);
    return full;
  }

  bumpAttention(topic: string, amount: number): void {
    this.state.attention[topic] = clamp((this.state.attention[topic] ?? 0) + amount, 0, 1);
  }

  recordLoss(kind: string, magnitude: number, noteHe: string): void {
    this.state.losses.push({ day: this.state.simDay, kind, magnitude, noteHe });
    this.log('loss_recorded', { kind, magnitude, noteHe });
  }

  // ------------------------------------------------------------- office

  loseOffice(reasonHe: string): void {
    if (!this.state.office.inOffice) return;
    this.state.office.inOffice = false;
    this.state.office.observer = true;
    this.state.office.lostDay = this.state.simDay;
    for (const ev of Object.values(this.state.events)) {
      if (ev.status === 'active') { ev.status = 'expired'; this.hooks.onDefaultAction?.(ev); }
    }
    this.log('office_change', { inOffice: false, reasonHe }, true);
  }

  returnToOffice(reasonHe: string): void {
    if (this.state.office.inOffice) return;
    this.state.office.inOffice = true;
    this.state.office.observer = false;
    this.state.office.sinceDay = this.state.simDay;
    this.state.office.returnMomentum = 0;
    this.log('office_change', { inOffice: true, reasonHe }, true);
  }

  // ------------------------------------------------------------- plans

  applyPlan(plan: WorldPlan): void {
    this.state.activePlanId = plan.id;
    const base = this.state.simDay;
    for (const t of plan.trends) this.trends.push({ ...t, startDay: base, planId: plan.id });
    for (const e of plan.events) this.schedule.push({ day: base + e.afterDays, kind: 'event', event: e, planId: plan.id });
    for (const c of plan.comms) this.schedule.push({ day: base + c.afterDays, kind: 'comm', comm: { msg: c.msg }, planId: plan.id });
    for (const m of plan.mapChanges) this.schedule.push({ day: base + m.afterDays, kind: 'map', map: m, planId: plan.id });
    for (const o of plan.optionUnlocks) this.state.optionStates[o] = 'open';
    for (const o of plan.optionClosures) this.state.optionStates[o] = 'closed';
    for (const c of plan.commitments ?? []) this.addCommitment(c);
    for (const [topic, v] of Object.entries(plan.attentionHints ?? {})) this.bumpAttention(topic, v);
    for (const mech of plan.dynamicMechanics ?? []) this.addMechanic(mech);
    if (plan.provenance.mode === 'escape') {
      this.log('atlas_escape', { planId: plan.id, reason: plan.provenance.reason });
    }
    this.log('plan_applied', { plan });
  }

  rejectPlan(planId: string, errors: string[]): void {
    this.log('plan_rejected', { planId, errors });
  }

  addMechanic(mech: DynamicMechanic): void {
    if (this.state.dynamicMechanics.some((m) => m.id === mech.id)) return;
    this.state.dynamicMechanics.push(mech);
    if (mech.type === 'metric' && mech.visible && !this.state.metrics[mech.id]) {
      this.state.metrics[mech.id] = { id: mech.id, value: this.state.hidden[mech.inputs[0]] ?? 50, trend: 0, visible: true, dynamic: true };
    }
    this.log('mechanic_added', mech);
  }

  setMetricVisibility(metricId: string, visible: boolean): boolean {
    const m = this.state.metrics[metricId];
    if (!m) return false;
    m.visible = visible; // hidden metrics keep their value and causal role
    this.log('metric_visibility', { metricId, visible });
    return true;
  }

  applyMapChange(mc: MapChange): void {
    const r = this.state.regions[mc.regionId];
    if (!r) return;
    if (mc.controller !== undefined) r.controller = mc.controller;
    if (mc.status !== undefined) r.status = mc.status;
    if (mc.intensity !== undefined) r.intensity = clamp(mc.intensity, 0, 1);
    for (const o of mc.addOverlays ?? []) if (!r.overlays.includes(o)) r.overlays.push(o);
    for (const o of mc.removeOverlays ?? []) r.overlays = r.overlays.filter((x) => x !== o);
    this.log('map_change', { ...mc });
  }

  // ------------------------------------------------------------- anchors

  markAnchorFired(anchorId: string): void {
    if (!this.state.anchorsFired.includes(anchorId)) {
      this.state.anchorsFired.push(anchorId);
      this.log('anchor_fired', { anchorId });
    }
  }

  markAnchorSuppressed(anchorId: string, reason: string): void {
    if (!this.state.anchorsSuppressed.includes(anchorId)) {
      this.state.anchorsSuppressed.push(anchorId);
      this.log('anchor_suppressed', { anchorId, reason });
    }
  }

  private actorNameHe(id: string): string {
    return this.state.actors[id]?.nameHe ?? id;
  }
}

// ---------------------------------------------------------------- init

export function buildInitialState(
  scenario: ScenarioPackage, runId: string, seed: string, provider: string, modelsExtra: Record<string, string>,
): GameState {
  const metrics: GameState['metrics'] = {};
  for (const def of scenario.metrics) {
    metrics[def.id] = {
      id: def.id,
      value: scenario.hiddenVars[`init_metric_${def.id}`] ?? 55,
      trend: 0,
      visible: scenario.defaultVisibleMetrics.includes(def.id),
    };
  }
  const hidden: Record<string, number> = {};
  for (const [k, v] of Object.entries(scenario.hiddenVars)) {
    if (!k.startsWith('init_metric_')) hidden[k] = v;
  }
  const regions: GameState['regions'] = {};
  for (const r of scenario.regions) {
    regions[r.id] = { id: r.id, controller: r.initialController, status: 'normal', intensity: 0, overlays: [] };
  }
  const actors: GameState['actors'] = {};
  for (const a of scenario.actors) {
    actors[a.id] = {
      id: a.id, nameHe: a.nameHe, language: a.language,
      leadership: { leaderName: a.leaderName, alive: true, sinceDay: 0, cohesion: 0.8 },
      priorityOrder: [...a.priorityOrder],
      timeHorizonYears: a.timeHorizonYears,
      willingnessToPay: a.willingnessToPay,
      capabilities: { ...a.capabilities },
      perceived: {},
      beliefs: {},
      knownFacts: [],
      memory: [],
      relationships: { ...a.relationships },
      externalControl: { ...(a.externalControl ?? {}) },
      adaptation: {},
      intelPenetrationByIsrael: a.intelPenetrationByIsrael,
      alive: true,
    };
  }
  return {
    runId, seed,
    versions: {
      scenario: `${scenario.meta.id}@${scenario.meta.version}`,
      atlas: 'unloaded',
      prompts: scenario.promptsVersion,
      engine: ENGINE_VERSION,
      models: modelsExtra,
      provider,
    },
    clock: { ...scenario.clock },
    simDay: 0,
    ended: false,
    office: { inOffice: true, observer: false, sinceDay: 0, returnMomentum: 0 },
    metrics,
    hidden,
    regions,
    actors,
    events: {},
    comms: [],
    playerMessages: [],
    directorChat: [],
    standingPolicies: [],
    commitments: [],
    attention: {},
    optionStates: {},
    divergence: { dims: {}, aggregate: 0, level: 'low' },
    hostages: { ...scenario.initialHostages },
    losses: [],
    dynamicMechanics: [],
    anchorsFired: [],
    anchorsSuppressed: [],
    counters: {},
  };
}
