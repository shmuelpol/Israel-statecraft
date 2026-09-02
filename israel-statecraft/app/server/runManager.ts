// Run lifecycle: simulation + director + meta channel + JSONL persistence.
// The tick loop is wall-clock driven here; tests and calibration drive the
// same engine manually. Replay reads logs only — it never touches providers.

import { mkdirSync, writeFileSync, appendFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { Simulation } from '../../engine/src/sim.js';
import { Director } from '../../ai/src/director.js';
import { MetaDirector } from '../../ai/src/meta.js';
import { LiveDirector } from '../../ai/src/live.js';
import type { LiveSession } from '../../ai/src/claudeCli.js';
import { computeFinalScore } from '../../ai/src/score.js';
import { classifyMessage, detectInjection } from '../../ai/src/classify.js';
import { validateScoreReport } from '../../engine/src/schema.js';
import type { ReplayEntry, FinalScoreReport, GameState, ScenarioPackage } from '../../engine/src/types.js';
import type { AtlasIndex } from '../../ai/src/retrieval.js';
import { SCENARIO } from '../../scenarios/swords-of-iron/index.js';
import { ATLAS_VERSION } from '../../atlas/src/generate.js';

export interface ClientEvent { type: string; payload: unknown }

export interface ClientView {
  runId: string;
  simDay: number;
  dateIso: string;
  ended: boolean;
  running: boolean;
  phase: 'warmup' | 'live';
  engineHe: string;
  office: { inOffice: boolean; observer: boolean };
  metrics: { id: string; nameHe: string; descHe: string; icon: string; level: number; trend: number; dynamic?: boolean }[];
  regions: Record<string, { controller: string; status: string; intensity: number; overlays: string[] }>;
  events: {
    id: string; type: string; titleHe: string; descHe: string; detailHe?: string; sourceHe: string; regionId?: string;
    anchor?: [number, number]; urgency: string; options: { id: string; labelHe: string; tradeoffHe?: string; recommended?: boolean }[];
    allowFreeText: boolean; status: string; urgencyFraction: number;
    recommendationHe?: string; recommendedBy?: string;
  }[];
  comms: { id: string; simDay: number; senderHe: string; kind: string; textHe: string; confidence?: string; regionId?: string; eventId?: string; inReplyTo?: string; significance?: string }[];
  briefingsDeep: Record<string, { textHe: string; simDay: number }>;
  playerMessages: { id: string; text: string; simDay: number; status: string; late: boolean; blockedReasonHe?: string }[];
  directorChat: { id: string; from: string; textHe: string; kind?: string }[];
  fronts: { topic: string; nameHe: string; icon: string; level: number; lineHe: string; consequenceHe?: string }[];
  /** timeline milestone ticks: fired major anchors as run-fraction positions (ref 02's timeline) */
  ticks: { frac: number; titleHe: string }[];
  score: FinalScoreReport | null;
}

export class Run {
  sim: Simulation;
  director: Director;
  meta: MetaDirector;
  live: LiveDirector | null = null;
  private logPath: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cycleCountdown = 0;
  private listeners = new Set<(e: ClientEvent) => void>();
  score: FinalScoreReport | null = null;
  seq = 0;

  /** Pre-game warm-up: the run has not "begun" yet — clock frozen while the
   *  situation room convenes and the live agent primes. No pause ever occurs
   *  once the run begins. Longer when a live agent needs to warm up. */
  phase: 'warmup' | 'live' = 'warmup';
  private warmupRemainingMs: number;

  /** Full in-memory log (always); mirrored to disk when runsDir is set. */
  entries: ReplayEntry[] = [];

  constructor(public runId: string, seed: string, public scenario: ScenarioPackage, atlas: AtlasIndex | null, runsDir: string | null, providerName: string, makeLiveSession?: () => LiveSession) {
    if (runsDir) {
      const dir = path.join(runsDir, runId);
      mkdirSync(dir, { recursive: true });
      this.logPath = path.join(dir, 'log.jsonl');
    } else {
      this.logPath = '';
    }
    this.sim = new Simulation(scenario, runId, seed, {
      log: (e) => this.persist(e),
      onDefaultAction: (ev) => this.director.onDefaultAction(ev),
    }, { atlas: ATLAS_VERSION }, providerName);
    this.sim.state.versions.atlas = ATLAS_VERSION;
    this.director = new Director(this.sim, scenario, atlas);
    this.meta = new MetaDirector(this.sim, scenario);
    if (makeLiveSession) {
      this.live = new LiveDirector(this.sim, scenario, this.director, this.meta, makeLiveSession());
    }
    // live agent needs a warm-up window; mock is near-instant
    this.warmupRemainingMs = this.live ? 9000 : 2500;
    // start priming and the opening convening immediately (before the clock runs)
    void this.live?.prime();
    if (this.logPath) {
      writeFileSync(path.join(path.dirname(this.logPath), 'meta.json'), JSON.stringify({
        runId, seed, createdAt: new Date().toISOString(), versions: this.sim.state.versions,
      }, null, 2), 'utf-8');
    }
  }

  private persist(e: ReplayEntry): void {
    e.realTs = this.logPath ? Date.now() : 0;
    this.entries.push(e);
    if (this.logPath) appendFileSync(this.logPath, JSON.stringify(e) + '\n', 'utf-8');
  }

  onUpdate(fn: (e: ClientEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private broadcast(): void {
    const view = this.view();
    for (const fn of this.listeners) fn({ type: 'view', payload: view });
  }

  start(): void {
    if (this.timer) return;
    let last = Date.now();
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(now - last, 1000); // clamp huge gaps (sleep); time never rewinds
      last = now;
      this.step(dt);
      this.broadcast();
    }, this.scenario.clock.tickMs);
  }

  /** Advance real dt ms: engine tick + periodic director planning. Used by wall-clock loop and headless harness alike. */
  step(dtMs: number): void {
    // pre-game warm-up: clock frozen while the room convenes and the agent primes
    if (this.phase === 'warmup') {
      this.warmupRemainingMs -= dtMs;
      if (!this.director.warmupConvened) this.director.convenePreGame();
      if (this.warmupRemainingMs > 0) return;
      this.phase = 'live';
    }
    if (this.sim.state.ended) {
      if (!this.score) this.finish();
      return;
    }
    this.sim.tick(dtMs);
    this.cycleCountdown -= dtMs;
    if (this.cycleCountdown <= 0) {
      this.cycleCountdown = 1500; // planning cadence: every 1.5s real (~4 sim days)
      this.director.cycle();
      this.live?.reactToDevelopments(); // fire-and-forget; skipped while the session is busy
      this.live?.warmBriefings(Director.BRIEFING_TOPICS, (topic, textHe) => {
        this.briefingsDeep[topic] = { textHe, simDay: this.sim.state.simDay };
      }); // background pre-warming for the inspector + updates center
    }
    if (this.sim.state.ended && !this.score) this.finish();
  }

  private finish(): void {
    const report = computeFinalScore(this.sim.state, this.scenario);
    const v = validateScoreReport(report);
    if (!v.ok) throw new Error('score report failed schema: ' + v.errors.join('; '));
    this.score = report;
    this.persist({ seq: 999999, simDay: this.sim.state.simDay, realTs: 0, type: 'score', payload: report });
    if (this.logPath) {
      writeFileSync(path.join(path.dirname(this.logPath), 'final.json'), JSON.stringify(report, null, 2), 'utf-8');
    }
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.broadcast();
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** channel: 'auto' (classify) | 'internal' (never public) | 'public' (declaration). */
  handleMessage(text: string, contextIds: string[], eventId?: string, optionId?: string, channel: 'auto' | 'internal' | 'public' = 'auto'): void {
    // option clicks carry their label so the history reads as a decision, not an empty bubble
    if (!text && eventId && optionId) {
      const ev = this.sim.state.events[eventId];
      const opt = ev?.options.find((o) => o.id === optionId);
      if (opt) text = `[החלטה] ${opt.labelHe}`;
    }
    const msg = this.sim.addPlayerMessage(text, contextIds, eventId, optionId);
    const cls = classifyMessage(text || '(בחירת אפשרות)', !!eventId);
    if (cls.injection) {
      this.sim.routeMessage(msg.id, undefined, undefined, cls.injection);
      this.sim.pushComm({ senderId: 'system', senderHe: 'המערכת', kind: 'internal', textHe: cls.injection, inReplyTo: msg.id, significance: 'high' });
      this.broadcast();
      return;
    }
    let intent = optionId ? ('event_response' as const) : cls.intent;
    if (!optionId && channel === 'public') intent = 'public_statement';
    if (!optionId && channel === 'internal' && (intent === 'public_statement' || intent === 'intl_statement')) intent = 'order';
    this.sim.routeMessage(msg.id, intent, cls.targetId);
    const questionLike = !optionId && ['question', 'assessment', 'options', 'intel_request'].includes(intent ?? '');
    if (this.live && questionLike) {
      // rule engine still handles attention/state; the live session owns the answer text
      this.director.onPlayerMessage(msg, { skipAdviserReply: true });
      this.live.answerQuestion(msg);
    } else {
      this.director.onPlayerMessage(msg);
    }
    this.broadcast();
  }

  handleDirectorMessage(text: string): void {
    this.sim.pushDirectorMsg('player', text);
    if (this.live && !detectInjection(text)) {
      this.live.answerDirectorChannel(text); // delayed live reply; falls back to rules internally
    } else {
      const res = this.meta.handle(text);
      this.sim.pushDirectorMsg('director', res.textHe, res.kind);
    }
    this.broadcast();
  }

  handleTyping(): void {
    this.sim.notifyTyping();
  }

  /** Updates-center briefing: rule-based, instant. */
  briefing(topic: string) {
    return this.director.briefingFor(topic);
  }

  /** In-depth live-AI briefing; arrives asynchronously into the view. */
  briefingsDeep: Record<string, { textHe: string; simDay: number }> = {};
  requestDeepBriefing(topic: string): boolean {
    if (!this.live) return false;
    const nameHe = Director.BRIEFING_TOPICS.find((t) => t.id === topic)?.nameHe ?? topic;
    this.live.deepBriefing(nameHe, (textHe) => {
      this.briefingsDeep[topic] = { textHe, simDay: this.sim.state.simDay };
      this.broadcast();
    });
    return true;
  }

  handleContext(ids: string[]): void {
    this.sim.recordContextSelect(ids);
  }

  view(): ClientView {
    const s: GameState = this.sim.state;
    const defs = Object.fromEntries(this.scenario.metrics.map((m) => [m.id, m]));
    const now = s.simDay;
    return {
      runId: this.runId,
      simDay: now,
      dateIso: this.sim.currentDateIso(),
      ended: s.ended,
      running: this.timer !== null,
      phase: this.phase,
      engineHe: s.versions.provider.startsWith('claude-cli:') ? `🔴 חי · ${s.versions.provider.slice('claude-cli:'.length).replace(/^claude-/, '').replace(/-\d+$/, '')}` : '⚙️ מנוע דטרמיניסטי',
      office: { inOffice: s.office.inOffice, observer: s.office.observer },
      metrics: Object.values(s.metrics).filter((m) => m.visible).map((m) => ({
        id: m.id,
        nameHe: defs[m.id]?.nameHe ?? s.dynamicMechanics.find((d) => d.id === m.id)?.labelHe ?? m.id,
        descHe: defs[m.id]?.descHe ?? '',
        icon: defs[m.id]?.icon ?? 'gear',
        level: Math.max(0, Math.min(4, Math.floor(m.value / 20))), // qualitative 5-step bar, no numbers
        trend: m.trend > 0.05 ? 1 : m.trend < -0.05 ? -1 : 0,
        dynamic: m.dynamic,
      })),
      // war status is inferred from the game itself: live escalation levels
      // brighten theaters beyond their last scripted map intensity
      regions: Object.fromEntries(Object.entries(s.regions).map(([k, r]) => {
        const escFor: Record<string, string> = { gaza: 'esc_gaza', lebanon: 'esc_north', iran: 'esc_iran', red_sea: 'esc_yemen', west_bank: 'esc_wb', syria: 'esc_north' };
        const esc = escFor[k] ? (s.hidden[escFor[k]] ?? 0) / 130 : 0;
        return [k, { controller: r.controller, status: r.status, intensity: Math.max(r.intensity, Math.min(0.95, esc)), overlays: r.overlays }];
      })),
      events: Object.values(s.events).filter((e) => e.status === 'active').slice(-3).map((e) => {
        const ann = this.director.annotateEvent(e);
        return {
          id: e.id, type: e.type, titleHe: e.titleHe, descHe: e.descHe, detailHe: e.detailHe, sourceHe: e.sourceHe,
          regionId: e.regionId, anchor: e.anchor, urgency: e.urgency,
          options: e.options.map((o) => ({ id: o.id, labelHe: o.labelHe, tradeoffHe: ann.notes[o.id]?.tradeoffHe, recommended: ann.notes[o.id]?.recommended })),
          allowFreeText: e.allowFreeText, status: e.status,
          urgencyFraction: Math.max(0, Math.min(1, (e.expiresDay - now) / Math.max(0.001, e.expiresDay - e.createdDay))),
          recommendationHe: ann.recommendationHe, recommendedBy: ann.recommendedBy,
        };
      }),
      comms: s.comms.slice(-110).map((c) => ({ id: c.id, simDay: c.simDay, senderHe: c.senderHe, kind: c.kind, textHe: c.textHe, confidence: c.confidence, regionId: c.regionId, eventId: c.eventId, inReplyTo: c.inReplyTo, significance: c.significance })),
      briefingsDeep: this.briefingsDeep,
      playerMessages: s.playerMessages.slice(-40).map((m) => ({ id: m.id, text: m.text, simDay: m.simDay, status: m.status, late: m.late, blockedReasonHe: m.blockedReasonHe })),
      directorChat: s.directorChat.slice(-40).map((d) => ({ id: d.id, from: d.from, textHe: d.textHe, kind: d.kind })),
      fronts: this.director.frontSummaries(),
      ticks: s.anchorsFired
        .map((id) => this.scenario.canonicalTimeline.find((a) => a.id === id))
        .filter((a): a is NonNullable<typeof a> => !!a && a.weight >= 2)
        .map((a) => ({
          frac: Math.max(0, Math.min(1, (Date.parse(a.date) - Date.parse(this.scenario.clock.startDate)) / (Date.parse(this.scenario.clock.endDate) - Date.parse(this.scenario.clock.startDate)))),
          titleHe: a.titleHe,
        })),
      score: s.ended ? this.score : null, // hidden during play
    };
  }
}

export class RunManager {
  private runs = new Map<string, Run>();
  private atlas: AtlasIndex | null = null;
  constructor(
    public runsDir: string,
    private providerName: string,
    private makeLiveSession?: (model: string) => LiveSession,
    private models: { id: string; nameHe: string }[] = [],
  ) {
    mkdirSync(runsDir, { recursive: true });
    const atlasPath = path.resolve(runsDir, '..', SCENARIO.atlasPath);
    if (existsSync(atlasPath)) {
      this.atlas = JSON.parse(readFileSync(atlasPath, 'utf-8')) as AtlasIndex;
    }
  }

  /** model: 'mock' (deterministic, no live agent) or a live model id. Falls
   *  back to mock when the requested model is unknown or the CLI is absent. */
  create(seed?: string, model?: string): Run {
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const known = this.models.some((m) => m.id === model);
    const useLive = !!this.makeLiveSession && !!model && model !== 'mock' && known;
    const factory = useLive ? () => this.makeLiveSession!(model!) : undefined;
    const providerLabel = useLive ? `claude-cli:${model}` : 'mock';
    const run = new Run(runId, seed ?? runId, SCENARIO, this.atlas, this.runsDir, providerLabel, factory);
    this.runs.set(runId, run);
    run.start();
    return run;
  }

  get(runId: string): Run | undefined {
    return this.runs.get(runId);
  }

  listRecorded(): { runId: string; meta: unknown }[] {
    const out: { runId: string; meta: unknown }[] = [];
    for (const d of readdirSync(this.runsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const metaPath = path.join(this.runsDir, d.name, 'meta.json');
      if (existsSync(metaPath)) {
        out.push({ runId: d.name, meta: JSON.parse(readFileSync(metaPath, 'utf-8')) });
      }
    }
    return out;
  }

  /** Replay: recorded log only. NO provider/model access exists on this path. */
  readReplay(runId: string): ReplayEntry[] | null {
    const p = path.join(this.runsDir, runId, 'log.jsonl');
    if (!existsSync(p)) return null;
    return readFileSync(p, 'utf-8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as ReplayEntry);
  }
}
