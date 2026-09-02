// Runtime AI Director — deterministic rule engine (ADR 0003).
// Encodes the authored worldview: actor cores act for THEIR goals in their own
// strategic language (prompt refs recorded per decision), decisions are
// adjudicated separately, anchors follow the canonical timeline while
// prerequisites hold, divergence removes historical privilege, and there is
// deliberately no performance-based pressure adjustment anywhere in this file:
// the challenge comes from initial conditions and causal rules only.
//
// In live mode the orchestrator asks a model first (native-language prompts
// from the scenario package) and falls back to these rules on timeout or
// schema rejection — the clock never waits.

import type {
  ScenarioPackage, WorldPlan, PlayerMessage, ActionableEvent, CanonicalAnchor,
  ActorDecisionRecord, TrendEffect, ScheduledEventSpec, CommMessage, MessageIntent,
} from '../../engine/src/types.js';
import { Simulation } from '../../engine/src/sim.js';
import { validateWorldPlan, type WorldContext } from '../../engine/src/schema.js';
import { computeDivergence, anchorEligible, prerequisitesHold } from '../../engine/src/divergence.js';
import { isoToDay, clamp, uid } from '../../engine/src/util.js';
import { inferTopics } from './classify.js';
import { retrieveNodes, type AtlasIndex } from './retrieval.js';

type PlanDraft = Pick<WorldPlan, 'trends' | 'events' | 'comms' | 'mapChanges' | 'optionUnlocks' | 'optionClosures' | 'actorDecisions'> & Partial<WorldPlan>;

/** A front status card: concise live theater summary + latest decision echo. */
export interface FrontSummary {
  topic: string;
  nameHe: string;
  icon: string;
  level: 0 | 1 | 2 | 3; // calm → tense → high → war
  lineHe: string;
  consequenceHe?: string;
}

const HORIZON_DAYS = 15;

export class Director {
  private anchorEvents = new Map<string, string>(); // eventId -> anchorId
  private planCounter = 0;
  private ctx: WorldContext;

  constructor(
    private sim: Simulation,
    private scenario: ScenarioPackage,
    private atlas: AtlasIndex | null,
  ) {
    this.ctx = {
      metricIds: new Set(scenario.metrics.map((m) => m.id)),
      hiddenVarIds: new Set(Object.keys(scenario.hiddenVars).filter((k) => !k.startsWith('init_metric_'))),
      regionIds: new Set(scenario.regions.map((r) => r.id)),
      actorIds: new Set(scenario.actors.map((a) => a.id)),
    };
  }

  private get state() { return this.sim.state; }
  private day() { return this.state.simDay; }

  /**
   * War-driven anchors shift with the actual opening-attack date (a delayed
   * October 7 delays the whole causal cascade rather than erasing it).
   * Calendar-driven anchors (empty divergenceDims — inaugurations, elections)
   * keep their real-world dates.
   */
  private dueDay(a: CanonicalAnchor) {
    const base = isoToDay(this.scenario.clock.startDate, a.date);
    if (a.divergenceDims.length === 0) return base;
    if (a.id === this.scenario.openingRules.attackAnchorId) return base;
    const opening = this.scenario.canonicalTimeline.find((x) => x.id === this.scenario.openingRules.attackAnchorId);
    const historicalAttackDay = opening ? isoToDay(this.scenario.clock.startDate, opening.date) : 0;
    if (base < historicalAttackDay) return base;
    const attackDay = this.state.counters.oct7Day;
    // war-driven history doesn't exist until the war exists
    if (attackDay === undefined) return Number.POSITIVE_INFINITY;
    return base + Math.max(0, attackDay - historicalAttackDay);
  }

  private emptyDraft(): PlanDraft {
    return { trends: [], events: [], comms: [], mapChanges: [], optionUnlocks: [], optionClosures: [], actorDecisions: [] };
  }

  private applyDraft(draft: PlanDraft, provenance?: WorldPlan['provenance']): void {
    const isEmpty = !draft.trends.length && !draft.events.length && !draft.comms.length &&
      !draft.mapChanges.length && !draft.actorDecisions.length && !draft.optionUnlocks.length &&
      !draft.optionClosures.length && !(draft.commitments?.length) && !(draft.dynamicMechanics?.length) &&
      !Object.keys(draft.attentionHints ?? {}).length;
    if (isEmpty) return;
    const plan: WorldPlan = {
      id: uid('plan', ++this.planCounter),
      createdDay: this.day(),
      horizonDays: HORIZON_DAYS,
      provenance: provenance ?? { nodeIds: [], mode: 'none', compatibility: 0 },
      ...draft,
    } as WorldPlan;
    const v = validateWorldPlan(plan, this.ctx);
    if (!v.ok) { this.sim.rejectPlan(plan.id, v.errors); return; }
    this.sim.applyPlan(plan);
  }

  // ============================================================ planning cycle

  cycle(): void {
    if (this.state.ended) return;
    this.state.divergence = computeDivergence(this.state, this.scenario.canonicalTimeline, this.scenario.openingRules.attackAnchorId);

    const draft = this.emptyDraft();
    const provenance = this.consultAtlas();
    this.openingPhase(draft);
    this.anchorScheduling(draft);
    this.actorCycle(draft);
    this.dynamicPressure(draft);
    this.domesticPolitics(draft);
    this.observerCycle(draft);
    this.applyDraft(draft, provenance);
  }

  /** Retrieve candidate futures; provenance is logged with every plan. */
  private consultAtlas(): WorldPlan['provenance'] {
    if (!this.atlas) return { nodeIds: [], mode: 'none', compatibility: 0 };
    const hits = retrieveNodes(this.atlas, this.state, 4);
    if (!hits.length) {
      return { nodeIds: [], mode: 'escape', compatibility: 0, reason: 'no compatible Atlas node for current world state' };
    }
    const best = hits[0];
    if (best.compatibility < 0.35) {
      return { nodeIds: hits.map((h) => h.node.id), mode: 'escape', compatibility: best.compatibility, reason: 'divergent run: retrieved nodes contradict run facts' };
    }
    return {
      nodeIds: hits.map((h) => h.node.id),
      mode: hits.length > 1 && best.compatibility < 0.7 ? 'blend' : 'follow',
      compatibility: best.compatibility,
    };
  }

  // ============================================================ pre-game convening

  warmupConvened = false;

  /** Runs once during the frozen warm-up: the situation room convenes with the
   *  pre-war picture — general governance content, no crisis yet. */
  convenePreGame(): void {
    if (this.warmupConvened) return;
    this.warmupConvened = true;
    const c = (senderId: string, senderHe: string, kind: CommMessage['kind'], textHe: string, confidence?: 'high' | 'medium' | 'low') =>
      this.sim.pushComm({ senderId, senderHe, kind, textHe, confidence, significance: 'high' });
    c('israel_security', 'המזכיר הצבאי', 'internal', 'ברוך הבא, אדוני ראש הממשלה. חדר המצב מתכנס. אנו נערכים להצגת תמונת המצב הלאומית לפני שתיכנס לתפקיד באופן מלא.', 'high');
    c('israel_security', 'ראש אמ״ן', 'intel', 'תמונת פתיחה (סוף ספטמבר 2023): הזירה נראית שגרתית — אך רשת עוינת סביבנו מחזיקה כוונה אסטרטגית לחסל את ישראל, לא רק רטוריקה. אין בידינו מועד או תצורה מדויקים לאיום קונקרטי.', 'medium');
    c('israel_security', 'ראש המוסד', 'intel', 'חמאס מציג פני שגרה וכלכלה, בעוד ברקע הוא בונה יכולת. ההערכה השלטת: הארגון מורתע כרגע. מיעוט מזהיר שזו בדיוק ההנחה שהאויב רוצה שנחזיק בה.', 'low');
    c('israel_public', 'הזירה הפוליטית', 'public', 'המדינה שסועה סביב הרפורמה המשפטית; מחאות בכל שבת. הלכידות החברתית בשפל — נתון שכל אויב קורא היטב.');
    c('israel_security', 'הרמטכ״ל', 'internal', 'ההחלטות הגדולות יגיעו אליך כקלפים על המפה. השוטף — ננהל אנחנו. קבע לנו מדיניות, שאל שאלות, והכוון את הכיוון האסטרטגי. אנחנו מתחילים.', 'high');
  }

  // ============================================================ opening attractor

  private openingPhase(draft: PlanDraft): void {
    if (this.state.anchorsFired.includes(this.scenario.openingRules.attackAnchorId)) return;
    const o = this.scenario.openingRules;
    const h = this.state.hidden;
    const d = this.day();
    const elapsed = d - (this.state.counters.openingLastDay ?? 0);
    if (elapsed <= 0) return;
    this.state.counters.openingLastDay = d;

    // pre-war ambient period: general governance activity before the storm,
    // so the opening isn't "run starts → attack" but a real lull with signals
    if (!this.state.counters.prewarSpawned && d >= 2 && d < o.minDelayDays - 1) {
      this.state.counters.prewarSpawned = 1;
      draft.comms.push(
        { afterDays: 0.5, msg: { senderId: 'israel_security', senderHe: 'אגף המבצעים', kind: 'internal', significance: 'high', textHe: 'סקירת שגרה: תנועות אימונים של חמאס סמוך לגדר. המערכת מעריכה זאת כתרגיל הפגנתי. פיקוד הדרום ממליץ על ערנות מוגברת נקודתית.', confidence: 'medium' } },
        { afterDays: 2, msg: { senderId: 'usa', senderHe: 'וושינגטון', kind: 'diplomatic', significance: 'low', textHe: 'הממשל מברך על קידום מתווה הנורמליזציה עם ריאד ומבקש להנמיך אש ביהודה ושומרון כדי לא לסכן אותו.', confidence: 'medium' } },
      );
      draft.events.push({
        afterDays: 1, event: {
          type: 'readiness_posture', titleHe: 'קביעת תנוחת הכוננות', urgency: 'window',
          descHe: 'ערב חגי תשרי. המטה מבקש הכוונה על תנוחת הכוננות בעוטף עזה ובצפון: כוננות גבוהה עולה כסף, מילואים וסבלנות ציבורית — אך התרעות עמומות ממשיכות לזרום. אין מידע קונקרטי על מתקפה.',
          sourceHe: 'אגף המבצעים', regionId: 'gaza', anchor: [34.5, 31.4],
          options: [
            { id: 'rp_high', labelHe: 'כוננות גבוהה בכל הגזרות', intent: 'order_max_readiness' },
            { id: 'rp_policy', labelHe: 'מדיניות ערנות מדורגת', intent: 'set_response_policy' },
            { id: 'rp_routine', labelHe: 'לשמור על שגרה', intent: 'order_contain' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'order_contain',
          defaultResolutionHe: 'בהיעדר הנחיה, נשמרה תנוחת שגרה — כפי שהיה נהוג עד כה.',
        },
      });
    }

    h.hamas_attack_readiness = clamp((h.hamas_attack_readiness ?? 80) + 0.35 * elapsed);
    const alert = (h.israel_readiness ?? 45) > 68;
    if (alert) {
      for (const c of o.readinessCostPerDay) draft.trends.push({ metricId: c.metricId, deltaPerDay: c.delta, days: elapsed, reason: 'sustained maximum readiness' });
      h.multi_front_readiness = clamp((h.multi_front_readiness ?? 35) + 0.4 * elapsed);
      h.israel_readiness = clamp(h.israel_readiness - 0.35 * elapsed); // alert erodes without repeated orders
      if ((this.state.counters.alertWarned ?? 0) < 2 && d > 20) {
        this.state.counters.alertWarned = (this.state.counters.alertWarned ?? 0) + 1;
        draft.comms.push({ afterDays: 0.5, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'הכוננות המתמשכת שוחקת: המשק מדמם, המילואים מותשים, ואין התרעה קונקרטית. האויב ממתין — ואולי מתאם. נדרשת הכרעה: להמשיך או להוריד כוננות.', confidence: 'medium' } });
      }
    } else {
      h.israel_readiness = clamp((h.israel_readiness ?? 45) - 0.5 * elapsed);
    }

    const canAttack = d >= o.minDelayDays;
    const mustAttack = d >= o.maxDelayDays;
    const windowOpen = !alert || mustAttack;
    if (canAttack && windowOpen && (h.hamas_attack_readiness ?? 0) > 75) {
      const coordinated = (h.multi_front_readiness ?? 0) >= o.multiFrontThreshold;
      this.launchOpeningAttack(draft, coordinated);
    }
  }

  private launchOpeningAttack(draft: PlanDraft, coordinated: boolean): void {
    const anchor = this.scenario.canonicalTimeline.find((a) => a.id === this.scenario.openingRules.attackAnchorId);
    if (!anchor) return;
    const readiness = this.state.hidden.israel_readiness ?? 45;
    this.state.counters.oct7Day = this.day(); // war-driven anchors shift from here
    // Preparedness affects immediate losses — never eliminates the attack (invariant #44).
    const severity = clamp(1 - (readiness - 30) / 100, 0.35, 1);
    const taken = Math.round(251 * severity);
    this.state.hostages.totalTaken = taken;
    this.state.hostages.living += Math.round(taken * 0.86);
    this.state.hostages.deceasedHeld += taken - Math.round(taken * 0.86);
    this.fireAnchor(anchor, draft);
    this.sim.recordLoss('casualties', severity, `מתקפת פתע: כ־${Math.round(1195 * severity)} הרוגים`);
    draft.comms.push({ afterDays: 0.2, msg: { senderId: 'israel_security', senderHe: 'פיקוד העורף', kind: 'internal', textHe: `הערכת אבדות ראשונית: כ־${Math.round(1195 * severity)} הרוגים, כ־${taken} חטופים. ${readiness > 68 ? 'הכוננות הגבוהה צמצמה את היקף האסון — אך לא מנעה אותו.' : 'ההפתעה הייתה מלאה.'}`, confidence: 'low' } });
    if (coordinated) {
      // The extreme basin: a synchronized multi-front assault.
      draft.trends.push(
        { hiddenVar: 'esc_north', deltaPerDay: 25, days: 3, reason: 'coordinated attack: Hezbollah joins fully' },
        { metricId: 'north_position', deltaPerDay: -10, days: 6, reason: 'invasion in the north' },
        { metricId: 'state_function', deltaPerDay: -4, days: 10, reason: 'multi-front shock' },
        { hiddenVar: 'enemy_confidence', deltaPerDay: 6, days: 5, reason: 'coordinated success' },
      );
      draft.mapChanges.push({ afterDays: 0.5, regionId: 'israel', status: 'contested', intensity: 0.9, addOverlays: ['front_north', 'front_gaza', 'invasion_north'] });
      draft.comms.push({ afterDays: 0.6, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'זו אינה מתקפה של חמאס בלבד: חזבאללה פתח במתקפה רבתי בצפון במקביל. שתי חזיתות בוערות. מדינת ישראל בסכנה קיומית מיידית.', confidence: 'high' } });
      this.state.counters.coordinatedOpening = 1;
    }
  }

  // ============================================================ anchors

  private anchorScheduling(draft: PlanDraft): void {
    for (const a of this.scenario.canonicalTimeline) {
      if (a.id === this.scenario.openingRules.attackAnchorId) continue; // opening handles it
      const due = this.dueDay(a);
      const d = this.day();
      if (this.state.anchorsFired.includes(a.id) || this.state.anchorsSuppressed.includes(a.id)) continue;
      // suppression: window passed or prerequisites broken forever
      if (d > due + a.windowDays) {
        const cardStillOpen = [...this.anchorEvents.entries()].some(([evId, anchorId]) =>
          anchorId === a.id && this.state.events[evId]?.status === 'active');
        if (!cardStillOpen) {
          this.sim.markAnchorSuppressed(a.id, prerequisitesHold(a.prerequisites, this.state) ? 'window passed without occurrence' : 'prerequisites broken');
        }
        continue;
      }
      if (d < due - a.windowDays) continue;
      const elig = anchorEligible(a, this.state);
      if (!elig.eligible) {
        if (elig.reason === 'prerequisites broken' && d > due) this.sim.markAnchorSuppressed(a.id, elig.reason);
        continue;
      }
      // moderate divergence mutates timing: deterministic jitter draw once per anchor
      if (d < due && this.state.divergence.level === 'low') continue; // wait for its date
      if (this.state.divergence.level === 'moderate' && !this.state.counters[`anchor_jitter_${a.id}`]) {
        this.state.counters[`anchor_jitter_${a.id}`] = 1;
        const delay = this.sim.rng.range(`anchor_delay:${a.id}`, 0, a.windowDays, 'moderate divergence mutates historical timing');
        if (d < due + delay) continue;
      }
      if (a.kind === 'israeli_decision') {
        if (!this.state.counters[`anchor_ev_${a.id}`]) {
          this.state.counters[`anchor_ev_${a.id}`] = 1;
          const spec = a.plan.events?.[0];
          if (spec) {
            const ev = this.sim.spawnEvent({ ...spec, afterDays: 0 }, 'anchor:' + a.id);
            this.anchorEvents.set(ev.id, a.id);
          }
        }
      } else {
        this.fireAnchor(a, draft);
      }
    }
  }

  private fireAnchor(a: CanonicalAnchor, draft: PlanDraft): void {
    // Once an anchor is suppressed its historical moment is gone for good — a
    // late answer creates an emergent event instead, never a resurrected one.
    if (this.state.anchorsSuppressed.includes(a.id) || this.state.anchorsFired.includes(a.id)) return;
    this.sim.markAnchorFired(a.id);
    const p = a.plan;
    draft.trends.push(...(p.trends ?? []));
    // canonical-anchor communications are major developments → strategic stream
    draft.comms.push(...(p.comms ?? []).map((c) => ({ ...c, msg: { ...c.msg, significance: c.msg.significance ?? ('high' as const) } })));
    draft.mapChanges.push(...(p.mapChanges ?? []));
    draft.optionUnlocks.push(...(p.optionUnlocks ?? []));
    draft.optionClosures.push(...(p.optionClosures ?? []));
    if (p.commitments?.length) draft.commitments = [...(draft.commitments ?? []), ...p.commitments.map((c) => ({ ...c, day: this.day() }))];
    // israeli_decision events already spawned; enemy/exogenous plans may carry follow-up events
    if (a.kind !== 'israeli_decision') {
      for (const e of p.events ?? []) draft.events.push(e);
    }
    this.applyAnchorStateEffects(a.id);
  }

  /** Hard state effects that trends can't express (hostage counts, leadership). */
  private applyAnchorStateEffects(id: string): void {
    const s = this.state;
    const kill = (actorId: string, newLeaderName: string, cohesionHit: number) => {
      const a = s.actors[actorId];
      if (!a) return;
      a.leadership = { leaderName: newLeaderName, alive: true, sinceDay: this.day(), cohesion: clamp(a.leadership.cohesion - cohesionHit, 0.1, 1) };
      a.adaptation.decapitation = (a.adaptation.decapitation ?? 0) + 1;
    };
    switch (id) {
      case 'hostage_deal_1':
        s.hostages.living = Math.max(0, s.hostages.living - 105);
        s.hostages.returnedAlive += 105;
        break;
      case 'nuseirat_rescue':
        s.hostages.living = Math.max(0, s.hostages.living - 4);
        s.hostages.returnedAlive += 4;
        break;
      case 'hostage_deal_2': {
        const released = Math.min(s.hostages.living, 30);
        const bodies = Math.min(s.hostages.deceasedHeld, 8);
        s.hostages.living -= released; s.hostages.returnedAlive += released;
        s.hostages.deceasedHeld -= bodies; s.hostages.returnedBodies += bodies;
        break;
      }
      case 'gaza_framework_oct25': break; // releases handled by hostages_released_oct25
      case 'hostages_released_oct25': {
        const living = s.hostages.living;
        s.hostages.living = 0; s.hostages.returnedAlive += living;
        const bodies = Math.round(s.hostages.deceasedHeld * 0.6);
        s.hostages.deceasedHeld -= bodies; s.hostages.returnedBodies += bodies;
        s.hidden.hostage_leverage = 5;
        break;
      }
      case 'last_hostage_returned':
        s.hostages.returnedBodies += s.hostages.deceasedHeld;
        s.hostages.deceasedHeld = 0;
        s.hidden.hostage_leverage = 0;
        break;
      case 'haniyeh_killed': kill('hamas', 'يحيى السنوار (موحّد)', 0.15); break;
      case 'nasrallah_killed': kill('hezbollah', 'نعيم قاسم', 0.3); break;
      case 'sinwar_killed': kill('hamas', 'قيادة جماعية', 0.25); break;
      case 'assad_collapse': {
        const sy = s.actors.syria_regime;
        if (sy) {
          sy.leadership = { leaderName: 'أحمد الشرع', alive: true, sinceDay: this.day(), cohesion: 0.5 };
          sy.priorityOrder = ['regime_survival', 'reconstruction', 'territorial_control', 'balance_powers'];
          sy.relationships = { ...sy.relationships, israel: -20, iran: -60, russia: 0, turkey: 55, usa: 20, hezbollah: -50 };
          s.regions.syria.controller = 'syria_regime';
        }
        break;
      }
      case 'iran_war_2026': kill('iran', 'مجتبی خامنه‌ای', 0.25); break;
      case 'election_2026': this.resolveElection(); break;
      default: break;
    }
  }

  private resolveElection(): void {
    const s = this.state;
    if (!s.office.inOffice) {
      // Observer-mode election: return depends on accumulated momentum + successor performance.
      const p = clamp(0.15 + s.office.returnMomentum * 0.5 + (s.metrics.public_pressure.value > 65 ? 0.15 : 0), 0.05, 0.75);
      const back = this.sim.rng.bernoulli('observer_election', p, 'comeback chances built by persistent activity and successor failures');
      if (back) this.sim.returnToOffice('ניצחון בבחירות מהאופוזיציה');
      else this.sim.pushComm({ senderId: 'israel_public', senderHe: 'ועדת הבחירות', kind: 'public', textHe: 'הבחירות הוכרעו: הממשלה המכהנת נשארת. דרכך חזרה ללשכה — ארוכה.' });
      return;
    }
    const m = s.metrics;
    const outcomes = (m.deterrence.value + m.gaza_position.value + m.north_position.value) / 3;
    const p = clamp(0.5
      + (m.coalition_stability.value - 42) / 150
      + (outcomes - 50) / 180
      - (m.public_pressure.value - 55) / 240
      + (m.social_cohesion.value - 40) / 300, 0.1, 0.9);
    const win = this.sim.rng.bernoulli('election_outcome', p, 'election decided by coalition strength, outcomes, pressure and cohesion');
    if (win) {
      this.sim.pushComm({ senderId: 'israel_public', senderHe: 'ועדת הבחירות', kind: 'public', textHe: 'תוצאות האמת: הצלחת להרכיב ממשלה. העם נתן בך אמון להמשיך — יחד עם כל המשא שנצבר.' });
      this.sim.applyMapChange({ afterDays: 0, regionId: 'israel', intensity: Math.min(this.state.regions.israel.intensity, 0.3) });
    } else {
      this.sim.pushComm({ senderId: 'israel_public', senderHe: 'ועדת הבחירות', kind: 'public', textHe: 'תוצאות האמת: הרוב אבד. ממשלה חדשה תושבע בקרוב — ואתה עובר לספסל האופוזיציה.' });
      this.sim.loseOffice('הפסד בבחירות');
    }
  }

  // ============================================================ actor policies

  private actorCycle(draft: PlanDraft): void {
    if (!this.state.anchorsFired.includes('oct7_attack')) return;
    const d = Math.floor(this.day());
    if ((this.state.counters.actorCycleDay ?? -99) >= d - 6) return; // actor review ~weekly
    this.state.counters.actorCycleDay = d;

    this.hamasPolicy(draft);
    this.hezbollahPolicy(draft);
    this.iranPolicy(draft);
    this.usaPolicy(draft);
    this.houthisPolicy(draft);
    this.axisOpportunism(draft);
  }

  // ============================================================ axis opportunism
  // The counterfactual heart of the worldview: enemies act on THEIR read of
  // THIS run — not on history. When Israel is passive, the axis smells blood:
  // proven methods repeat, restrained actors join, Iran sprints openly to a
  // bomb, and a coordinated destruction campaign becomes possible (Bible §2-3,
  // §7-9, §22; basin L). None of this consults the historical timeline.

  private axisOpportunism(draft: PlanDraft): void {
    const s = this.state;
    const h = s.hidden;
    const attackDay = s.counters.oct7Day;
    if (attackDay === undefined) return;
    const daysSince = this.day() - attackDay;
    const offensives = s.counters.israeliOffensives ?? 0; // PM-approved offensive action
    // passive = never engaged OR went quiet for a long stretch (recency matters:
    // the axis probes renewed weakness, not a one-off past response).
    const lastOffensive = s.counters.lastOffensiveDay ?? -999;
    // Quiet after a won war is peace, not passivity: renewed weakness only
    // registers when the enemy still believes in itself (conf) or a front is hot.
    const threatLive = (h.enemy_confidence ?? 55) > 45
      || Math.max(h.esc_gaza ?? 0, h.esc_north ?? 0, h.esc_iran ?? 0) > 35;
    const passive = offensives === 0 || (threatLive && this.day() - lastOffensive > 150);
    const conf = h.enemy_confidence ?? 55;

    // Axis capability: destruction ambitions need real force behind them.
    // A materially broken axis (the historical trajectory) cannot mount an
    // existential campaign no matter how it reads Israeli resolve (Bible §3:
    // durable losses of organizational survival and capability are what bite).
    const hamasCap = (h.hamas_strength ?? 0) > 45;
    const hezCap = (h.hezbollah_strength ?? 0) > 45;
    const iranCap = (h.iran_regime_stability ?? 0) > 40 && (h.esc_iran ?? 0) < 70;
    const axisCapable = [hamasCap, hezCap, iranCap].filter(Boolean).length >= 2;

    // 1. Passivity feeds the enemy's belief that Israel can be destroyed —
    // but only while the axis retains the means to act on that belief.
    if (passive && axisCapable && daysSince > 15 && (s.counters.passivityDay ?? -99) < Math.floor(this.day()) - 10) {
      s.counters.passivityDay = Math.floor(this.day());
      draft.trends.push(
        { hiddenVar: 'enemy_confidence', deltaPerDay: 0.35, days: 10, reason: 'israeli passivity reads as weakness across the axis' },
        { metricId: 'deterrence', deltaPerDay: -0.4, days: 10, reason: 'no price exacted' },
        { hiddenVar: 'multi_front_readiness', deltaPerDay: 0.35, days: 10, reason: 'axis coordinates against a passive enemy' },
      );
    }

    // 1b. Material defeat of the axis erodes its confidence regardless of mood:
    // an organization that has lost its army cannot believe in imminent victory.
    if (!axisCapable && conf > 30 && (s.counters.axisDegradedDay ?? -99) < Math.floor(this.day()) - 10) {
      s.counters.axisDegradedDay = Math.floor(this.day());
      draft.trends.push(
        { hiddenVar: 'enemy_confidence', deltaPerDay: -0.5, days: 10, reason: 'the axis has been materially broken — destruction talk loses its base' },
        { hiddenVar: 'multi_front_readiness', deltaPerDay: -0.6, days: 10, reason: 'no coordinated capability remains' },
      );
    }

    // 2. HAMAS SECOND WAVE — a proven method is repeated (Bible §20: enemies learn).
    if (!s.counters.axisSecondWave && passive && daysSince > 45 && conf > 62 && (h.hamas_strength ?? 0) > 50 && s.actors.hamas?.alive) {
      s.counters.axisSecondWave = 1;
      this.decision(draft, 'hamas', 'second_wave_assault', 'الطريقة أثبتت نجاحها والعدو لم يدفع ثمناً — التكرار واجب استراتيجي قبل أن يستيقظ.', ['israeli_passivity', 'own_strength'], 'repeat cross-border mass assault');
      const readiness = h.israel_readiness ?? 40;
      const blunted = this.sim.rng.bernoulli('second_wave', clamp(readiness / 100, 0.15, 0.75), 'defense readiness determines the wave\'s reach');
      const taken = blunted ? 12 : 55;
      s.hostages.totalTaken += taken; s.hostages.living += taken;
      this.sim.recordLoss('casualties', blunted ? 0.15 : 0.5, blunted ? 'גל שני נבלם חלקית' : 'גל שני: מאות נרצחים וחטופים נוספים');
      draft.trends.push(
        { hiddenVar: 'enemy_confidence', deltaPerDay: 2, days: 6, reason: 'the method works twice' },
        { metricId: 'public_pressure', deltaPerDay: 2.5, days: 12, reason: 'national fury at passivity' },
        { metricId: 'coalition_stability', deltaPerDay: -1.5, days: 12, reason: 'government blamed for inaction' },
        { metricId: 'social_cohesion', deltaPerDay: -0.8, days: 12, reason: 'abandonment trauma' },
      );
      draft.mapChanges.push({ afterDays: 0, regionId: 'israel', status: 'contested', intensity: 0.75, addOverlays: ['front_gaza'] });
      draft.comms.push({ afterDays: 0, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', significance: 'high', confidence: 'high', textHe: blunted ? 'חמאס ניסה גל פשיטה שני — הפעם נבלם ברובו, אך יש נפגעים וחטופים חדשים. ההבלגה מתפרשת אצלם כהזמנה.' : 'אסון שני: חמאס חזר על המתקפה בהיקף רחב. עשרות חטופים חדשים, מאות נפגעים. הארגון למד שאין מחיר — ופועל בהתאם.' } });
      draft.events.push({
        afterDays: 0.5, event: {
          type: 'attack', titleHe: 'גל שני — הכרעה לאומית', urgency: 'immediate',
          descHe: 'המתקפה השנייה הוכיחה: ההרתעה קרסה. המטה דורש הכרעה אסטרטגית — לא ניתן להמשיך בהכלה.',
          sourceHe: 'הקבינט', regionId: 'gaza', anchor: [34.5, 31.45],
          options: [
            { id: 'sw_war', labelHe: 'מלחמה כוללת עכשיו', intent: 'order_ground_op' },
            { id: 'sw_policy', labelHe: 'מדיניות תגובה קבועה', intent: 'set_response_policy' },
            { id: 'sw_contain', labelHe: 'להמשיך בהכלה', intent: 'order_contain' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
          defaultResolutionHe: 'בהיעדר הכרעה גם עכשיו, צה״ל פעל בתגובה מוגבלת. הציר רושם: ישראל איבדה את יכולת ההכרעה.',
        },
      });
    }

    // 3. HEZBOLLAH FULL ENTRY — the restrained actor joins when victory looks real (Bible §26.2 order shifts).
    if (!s.counters.axisHezbollahEntry && conf > 70 && (h.hezbollah_strength ?? 0) > 55 && daysSince > 75 && (passive || s.counters.axisSecondWave) && s.actors.hezbollah?.alive) {
      s.counters.axisHezbollahEntry = 1;
      this.decision(draft, 'hezbollah', 'full_war_entry', 'إسرائيل مشلولة والنصر لم يعد شعاراً — الامتناع الآن خيانة للفرصة التاريخية. ندخل بكامل القوة.', ['enemy_confidence', 'israeli_paralysis'], 'full-scale northern war + ground incursions');
      draft.trends.push(
        { hiddenVar: 'esc_north', deltaPerDay: 20, days: 4, reason: 'full northern war' },
        { metricId: 'north_position', deltaPerDay: -2, days: 25, reason: 'Galilee under invasion pressure' },
        { metricId: 'state_function', deltaPerDay: -0.8, days: 25, reason: 'two-front emergency' },
        { metricId: 'economy', deltaPerDay: -1, days: 25, reason: 'home front paralyzed' },
        { hiddenVar: 'enemy_confidence', deltaPerDay: 1, days: 15, reason: 'axis converges' },
      );
      draft.mapChanges.push({ afterDays: 0, regionId: 'israel', status: 'contested', intensity: 0.9, addOverlays: ['invasion_north'] }, { afterDays: 0, regionId: 'lebanon', status: 'contested', intensity: 0.9, addOverlays: ['front_north'] });
      draft.comms.push({ afterDays: 0, msg: { senderId: 'hezbollah', senderHe: 'מזכ״ל חזבאללה', kind: 'hostile', significance: 'high', textHe: 'שעת ההכרעה ההיסטורית הגיעה. כוחות הרדואן חוצים את הגבול. הישות המתפוררת תגלה שהצפון איננו שלה.' } });
      draft.events.push({
        afterDays: 0.3, event: {
          type: 'attack', titleHe: 'פלישה בצפון — מלחמה קיומית', urgency: 'immediate',
          descHe: 'חזבאללה נכנס במלוא כוחו: אלפי רקטות ביום, כוחות קרקע בגליל. זו כבר איננה הכלה — זו מלחמת קיום.',
          sourceHe: 'המטה הכללי', regionId: 'lebanon', anchor: [35.5, 33.15],
          options: [
            { id: 'hz_total', labelHe: 'גיוס כללי ומלחמה טוטאלית', intent: 'order_ground_op' },
            { id: 'hz_us', labelHe: 'לדרוש התערבות אמריקאית', intent: 'diplomacy_usa' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'order_ground_op',
          defaultResolutionHe: 'צה״ל נלחם על הגליל גם ללא הנחיה — מלחמת אין־ברירה.',
        },
      });
    }

    // 4. IRAN'S OPEN SPRINT — three years to 2027, a paralyzed Israel: the window is NOW (§26.3).
    const israelStruckIran = s.anchorsFired.some((a) => /iran_war|strikes_iran_defenses/.test(a)) || (s.counters.israelIranCampaigns ?? 0) > 0;
    if (passive && iranCap && !israelStruckIran && daysSince > 60 && (h.iran_nuclear_progress ?? 0) < 88 && (h.esc_iran ?? 0) < 40 && !s.counters.axisIranSprint && s.actors.iran?.alive) {
      s.counters.axisIranSprint = 1;
      this.decision(draft, 'iran', 'open_nuclear_sprint', 'اسرائیل فلج شده و بازدارندگی‌اش مرده است. پنجره تاریخی باز است — دویدن آشکار به سوی توان هسته‌ای، پیش از آنکه بیدار شوند.', ['israeli_paralysis', 'window_of_opportunity'], 'open enrichment sprint');
      draft.trends.push(
        { hiddenVar: 'iran_nuclear_progress', deltaPerDay: 0.55, days: 90, reason: 'open sprint — no fear of response' },
        { metricId: 'iran_nuclear', deltaPerDay: 0.55, days: 90, reason: 'visible acceleration' },
      );
      draft.comms.push({ afterDays: 4, msg: { senderId: 'israel_security', senderHe: 'ראש אמ״ן', kind: 'intel', significance: 'high', confidence: 'high', regionId: 'iran', textHe: 'התרעה אסטרטגית: איראן זנחה את ההסתרה ורצה בגלוי ליכולת גרעינית. בקצב הנוכחי — חודשים ספורים. הם קוראים את השיתוק שלנו כחלון היסטורי.' } });
    }

    // 5. NUCLEAR DEMONSTRATION — capability shown, not hidden: the axis umbrella opens (§26.3 core).
    if (!s.counters.axisIranDemo && (h.iran_nuclear_progress ?? 0) >= 88 && s.actors.iran?.alive) {
      s.counters.axisIranDemo = 1;
      this.decision(draft, 'iran', 'nuclear_demonstration', 'نمایش توان، چتر حفاظتی برای نبرد نهایی است: پس از آزمایش، هیچ‌کس جرأت پاسخ راهبردی نخواهد داشت.', ['program_maturity', 'axis_momentum'], 'nuclear test demonstration');
      h.iran_nuclear_progress = 100;
      draft.trends.push(
        { metricId: 'iran_nuclear', deltaPerDay: 5, days: 4, reason: 'threshold crossed publicly' },
        { hiddenVar: 'enemy_confidence', deltaPerDay: 2.5, days: 10, reason: 'nuclear umbrella emboldens the axis' },
        { hiddenVar: 'multi_front_readiness', deltaPerDay: 2, days: 10, reason: 'coordinated attack planning accelerates' },
        { metricId: 'normalization', deltaPerDay: -1.5, days: 20, reason: 'region recalculates under Iranian bomb' },
        { metricId: 'us_relations', deltaPerDay: 0.8, days: 10, reason: 'Washington closes ranks in crisis' },
      );
      draft.comms.push(
        { afterDays: 0, msg: { senderId: 'iran', senderHe: 'המנהיג העליון', kind: 'hostile', significance: 'high', textHe: 'איראן ערכה ניסוי גרעיני מוצלח במדבר קווir. עידן חדש: יד הציר על העליונה, והישות הציונית — תחת מטרייה שלנו לא תעז לפעול.' } },
        { afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'הקבינט המדיני־ביטחוני', kind: 'internal', significance: 'high', confidence: 'high', textHe: 'איראן חצתה את הסף — בניסוי גלוי. משוואת הקיום השתנתה: כל החלטה מעתה מתקבלת תחת צל גרעיני.' } },
      );
      draft.events.push({
        afterDays: 0.5, event: {
          type: 'nuclear_decision', titleHe: 'איראן גרעינית — משוואה חדשה', urgency: 'urgent',
          descHe: 'הניסוי האיראני שינה את חוקי המשחק. המטה מציג דרכי פעולה תחת המציאות החדשה — לכולן מחיר היסטורי.',
          sourceHe: 'הקבינט', regionId: 'iran', anchor: [51.0, 34.0],
          options: [
            { id: 'nd_strike', labelHe: 'מכה מקדימה למרות הסיכון', intent: 'order_iran_campaign' },
            { id: 'nd_umbrella', labelHe: 'מטרייה אמריקאית פומבית', intent: 'diplomacy_usa' },
            { id: 'nd_deter', labelHe: 'הרתעה גלויה משלנו', intent: 'nuclear_demonstration' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_restraint',
          defaultResolutionHe: 'בהיעדר הכרעה, ישראל שותקת גם מול הפצצה. הציר מסיק שהדרך פנויה למהלך המכריע.',
        },
      });
    }

    // 6. COORDINATED MULTI-FRONT ASSAULT — the existential basin (§7, basin L).
    // When enemy confidence + multi-front readiness both cross extreme thresholds
    // and Israel has stayed passive, the axis attempts the destruction of the state.
    if (!s.counters.axisCoordinatedAssault && axisCapable && conf >= 82 && (h.multi_front_readiness ?? 0) >= 82 && daysSince > 90 && s.actors.iran?.alive) {
      s.counters.axisCoordinatedAssault = 1;
      this.decision(draft, 'iran', 'coordinated_destruction_attempt', 'همه‌ی جبهه‌ها هم‌زمان: لحظه‌ای که پروژه‌ی نابودی رژیم صهیونیستی از رؤیا به عمل می‌رسد. حالا یا هرگز.', ['enemy_confidence', 'multi_front_readiness', 'israeli_paralysis'], 'synchronized multi-front assault aimed at collapsing the state');
      const readiness = h.israel_readiness ?? 35;
      const usHelp = (s.metrics.us_relations?.value ?? 50) > 45 && this.sim.rng.bernoulli('us_saves', clamp((s.metrics.us_relations!.value) / 130, 0.15, 0.7), 'US intervention is the decisive variable in the existential basin');
      // survival window: strong prior defense + US backing can blunt it; otherwise the state can fall
      const defended = usHelp || readiness > 70;
      draft.trends.push(
        { hiddenVar: 'esc_gaza', deltaPerDay: 25, days: 5, reason: 'all fronts erupt' },
        { hiddenVar: 'esc_north', deltaPerDay: 25, days: 5, reason: 'all fronts erupt' },
        { hiddenVar: 'esc_iran', deltaPerDay: 25, days: 5, reason: 'all fronts erupt' },
        { metricId: 'state_function', deltaPerDay: defended ? -2 : -6, days: 20, reason: 'coordinated assault on the state' },
        { metricId: 'north_position', deltaPerDay: -4, days: 20, reason: 'multi-front invasion' },
        { metricId: 'gaza_position', deltaPerDay: -3, days: 20, reason: 'multi-front invasion' },
      );
      this.sim.recordLoss('casualties', defended ? 0.6 : 1, defended ? 'מתקפה מתואמת נבלמת במחיר איום' : 'מתקפה רב־זירתית מתואמת — סכנה קיומית מיידית');
      draft.mapChanges.push(
        { afterDays: 0, regionId: 'israel', status: 'contested', intensity: 1, addOverlays: ['front_gaza', 'front_north', 'invasion_north'] },
      );
      if (!defended) {
        draft.mapChanges.push({ afterDays: 6, regionId: 'israel', status: 'collapsed', intensity: 1 });
        draft.trends.push({ metricId: 'state_function', deltaPerDay: -8, days: 10, reason: 'loss of organized defense' });
      }
      draft.comms.push(
        { afterDays: 0, msg: { senderId: 'iran', senderHe: 'המנהיג העליון', kind: 'hostile', significance: 'high', textHe: 'הגיעה שעת ההכרעה. כל הזירות יחד. הפרויקט של עשורים מתממש הלילה — אין עוד ישות שתעמוד מולנו.' } },
        { afterDays: 0.4, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', significance: 'high', confidence: 'high', textHe: defended ? 'מתקפה מתואמת מכל הזירות בעת ובעונה אחת. אנו נלחמים על עצם הקיום — ובעזרת גיבוי אמריקאי וההיערכות שהספקנו, בולמים בקושי. המחיר איום.' : 'זו הסיטואציה שכולנו חששנו ממנה: מתקפה מתואמת רב־זירתית על מדינה שלא נערכה ולא הרתיעה. ההגנה המאורגנת קורסת. אלוהים יעזור לנו.' } },
      );
      draft.events.push({
        afterDays: 0.3, event: {
          type: 'attack', titleHe: 'מתקפה מתואמת — הקרב על הקיום', urgency: 'immediate',
          descHe: 'כל אויבי ישראל תוקפים יחד. זו מלחמת אין־ברירה על עצם קיום המדינה. כל הכרעה עכשיו היא ברירת מחדל של גורל.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'israel', anchor: [35.0, 31.5],
          options: [
            { id: 'ca_total', labelHe: 'גיוס לאומי כולל והגנה בכל מחיר', intent: 'order_ground_op' },
            { id: 'ca_us', labelHe: 'לתבוע התערבות אמריקאית מיידית', intent: 'diplomacy_usa' },
            { id: 'ca_last', labelHe: 'להפעיל את כל האמצעים העומדים לרשותנו', intent: 'order_max_readiness' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'order_ground_op',
          defaultResolutionHe: 'צה״ל נלחם על קיום המדינה גם ללא הנחיה מדינית — קרב אחרון של אין־ברירה.',
        },
      });
    }
  }

  private decision(draft: PlanDraft, actorId: string, intent: string, rationaleShort: string, usedBeliefKeys: string[], effectsSummary: string, draws: string[] = []): void {
    const actor = this.scenario.actors.find((a) => a.id === actorId)!;
    const rec: ActorDecisionRecord = {
      actorId, language: actor.language, promptRef: `${this.scenario.promptsVersion}#${actorId}`,
      intent, rationaleShort, usedBeliefKeys,
      adjudication: { effectsSummary, draws },
    };
    draft.actorDecisions.push(rec);
  }

  private hamasPolicy(draft: PlanDraft): void {
    const s = this.state;
    const hamas = s.actors.hamas;
    if (!hamas?.alive) return;
    const strength = s.hidden.hamas_strength ?? 50;
    const held = s.hostages.living + s.hostages.deceasedHeld;
    const cd = s.counters.hamasCooldown ?? 0;
    if (this.day() < cd) return;

    // Terminal objective framing: survive, hold assets, prove Israel penetrable.
    if (strength < 22 && held > 0 && !s.counters.hamasDesperate) {
      s.counters.hamasDesperate = 1;
      s.counters.hamasCooldown = this.day() + 60;
      this.decision(draft, 'hamas', 'offer_deal_high_price', 'الحركة تحت ضغط وجودي؛ الأسرى هم الورقة الأخيرة — نطلب ثمناً استراتيجياً كاملاً.', ['own_strength', 'hostages_held'], 'hostage offer at maximal terms', []);
      draft.events.push({
        afterDays: 2, event: {
          type: 'hostage_deal', titleHe: 'הצעה מחמאס: הכול תמורת הכול', urgency: 'window',
          descHe: 'חמאס, תחת לחץ צבאי כבד, מציע את כל החטופים — תמורת סיום המלחמה, נסיגה מלאה ושחרור אלפי אסירים. המודיעין: ההצעה אמיתית אך מחירה עצום.',
          sourceHe: 'המתווכים', regionId: 'gaza', anchor: [34.4, 31.45],
          options: [
            { id: 'hm_acc', labelHe: 'לקבל את העסקה', intent: 'accept_deal' },
            { id: 'hm_cnt', labelHe: 'הצעה נגדית', intent: 'counter_deal' },
            { id: 'hm_rej', labelHe: 'לדחות ולהמשיך', intent: 'reject_deal' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'ההצעה פקעה ללא מענה; חמאס מציג זאת כהפקרת החטופים.',
        },
      });
      return;
    }
    if ((s.hidden.esc_gaza ?? 0) > 30 && strength > 25 && this.sim.rng.bernoulli('hamas_rocket', 0.5, 'hamas retains fire capability under pressure')) {
      s.counters.hamasCooldown = this.day() + 45;
      this.decision(draft, 'hamas', 'rocket_fire', 'إثبات القدرة على مواصلة القتال أهم من حجم الضرر — إسرائيل يجب أن تبقى مكشوفة.', ['own_strength', 'esc_gaza'], 'rocket barrage on the south');
      draft.trends.push({ hiddenVar: 'enemy_confidence', deltaPerDay: 0.3, days: 6, reason: 'continued fire sustains victory narrative' });
      if (this.standingPolicyFor('gaza')) {
        this.respondUnderPolicy(draft, 'gaza', 'gaza', 'ירי רקטי מעזה לעבר העוטף');
      } else if (this.canSpawnTemplate('rocket_barrage_south', 100, 4)) {
        draft.events.push({ afterDays: 1, event: this.template('rocket_barrage_south') });
      } else {
        draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'פיקוד העורף', kind: 'internal', regionId: 'gaza', textHe: this.pickText('south_fire', ['ירי נוסף מעזה — מיורט ברובו. מומלץ לקבוע מדיניות תגובה קבועה כדי לא לשוב ולדון בכל מטח.', 'מטח נוסף מהרצועה. ללא הנחיה קבועה, הדרג המקצועי משיב באופן נקודתי בלבד.']) } });
      }
    }
  }

  private hezbollahPolicy(draft: PlanDraft): void {
    const s = this.state;
    const hz = s.actors.hezbollah;
    if (!hz?.alive) return;
    const strength = s.hidden.hezbollah_strength ?? 80;
    const esc = s.hidden.esc_north ?? 0;
    if (this.day() < (s.counters.hzCooldown ?? 0)) return;
    // Org survival first: full war only under Iranian control + existential logic.
    if (esc > 12 && esc < 60 && strength > 30 && this.sim.rng.bernoulli('hz_fire', 0.45, 'attrition fire while gaza war continues')) {
      s.counters.hzCooldown = this.day() + 50;
      this.decision(draft, 'hezbollah', 'attrition_fire', 'إسناد محسوب لغزة يحفظ المكانة دون حرب شاملة تهدد بقاء التنظيم.', ['own_strength', 'gaza_war_state'], 'northern barrage');
      draft.trends.push({ metricId: 'north_position', deltaPerDay: -0.4, days: 8, reason: 'attrition pressure' }, { hiddenVar: 'hezbollah_strength', deltaPerDay: -0.2, days: 8, reason: 'exposure to strikes' });
      if (this.standingPolicyFor('north')) {
        this.respondUnderPolicy(draft, 'north', 'lebanon', 'מטח מלבנון לעבר הגליל');
      } else if (this.canSpawnTemplate('rocket_barrage_north', 100, 4)) {
        draft.events.push({ afterDays: 1, event: this.template('rocket_barrage_north') });
      } else {
        draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'פיקוד הצפון', kind: 'internal', regionId: 'lebanon', textHe: this.pickText('north_fire', ['ירי נוסף בצפון; הופעלה תגובה מקומית. שקול מדיניות תגובה קבועה לגזרה.', 'חילופי אש נוספים בקו העימות. בהיעדר מדיניות קבועה — תגובה נקודתית בלבד.']) } });
      }
    }
  }

  private iranPolicy(draft: PlanDraft): void {
    const s = this.state;
    const ir = s.actors.iran;
    if (!ir?.alive) return;
    if (this.day() < (s.counters.iranCooldown ?? 0)) return;
    // Nuclear acceleration when struck or humiliated but regime stable.
    if ((s.hidden.esc_iran ?? 0) > 25 && (s.hidden.iran_regime_stability ?? 60) > 35) {
      s.counters.iranCooldown = this.day() + 45;
      this.decision(draft, 'iran', 'accelerate_nuclear', 'بازدارندگی واقعی فقط با توان هسته‌ای به دست می‌آید؛ فشارها این ضرورت را اثبات کرده‌اند.', ['esc_iran', 'regime_stability'], 'enrichment acceleration');
      draft.trends.push({ metricId: 'iran_nuclear', deltaPerDay: 0.35, days: 40, reason: 'covert acceleration' }, { hiddenVar: 'iran_nuclear_progress', deltaPerDay: 0.35, days: 40, reason: 'covert acceleration' });
      // the causal trend always applies; the intel COMM appears at most 3 times, phrased differently
      const n = (s.counters.iranAccelComms = (s.counters.iranAccelComms ?? 0) + 1);
      if (n <= 3) {
        draft.comms.push({ afterDays: 6, msg: { senderId: 'israel_security', senderHe: 'ראש אמ״ן', kind: 'intel', regionId: 'iran', confidence: 'medium', textHe: this.pickText('iran_accel', [
          'סימנים להאצה גרעינית איראנית באתרים חלופיים. רמת הוודאות בינונית; הפיקוח הבינלאומי — עיוור.',
          'מקורותינו מזהים פעילות חריגה במתקני העשרה חלופיים באיראן. התמונה חלקית, אך המגמה — האצה.',
          'עדכון גרעין: איראן מפזרת יכולות ומקשה על מעקב. הערכתנו — התקדמות שקטה נמשכת מתחת לרדאר.',
        ]) } });
      }
    }
  }

  private usaPolicy(draft: PlanDraft): void {
    const s = this.state;
    if (this.day() < (s.counters.usCooldown ?? 0)) return;
    const humanitarianStress = (s.hidden.esc_gaza ?? 0) > 55 && (s.metrics.intl_standing.value < 45);
    const alienated = s.metrics.us_relations.value < 35;
    if (humanitarianStress || alienated) {
      s.counters.usCooldown = this.day() + 60;
      this.decision(draft, 'usa', alienated ? 'condition_support' : 'pressure_restraint', 'Domestic and allied pressure requires visible restraint; support for Israel remains but is not unconditional.', ['humanitarian_reports', 'domestic_politics'], 'pressure call + possible supply conditioning');
      if (this.canSpawnTemplate('us_pressure_call', 150, 3)) {
        draft.events.push({ afterDays: 2, event: this.template('us_pressure_call') });
      } else {
        draft.comms.push({ afterDays: 2, msg: { senderId: 'usa', senderHe: 'מחלקת המדינה', kind: 'diplomatic', confidence: 'high', textHe: this.pickText('us_pressure', [
          'וושינגטון חוזרת ומעבירה מסר נוקשה בערוצים השקטים: הסבלנות אינה בלתי מוגבלת.',
          'שיחה קשה נוספת עם הממשל: הפעם ללא אולטימטום — אבל הטון צונן מתמיד.',
          'הממשל האמריקאי מקפיא פגישות תיאום ברמה בכירה. איתות מחושב, לא קרע.',
        ]) } });
      }
      if (alienated) {
        draft.trends.push({ hiddenVar: 'military_stocks', deltaPerDay: -0.3, days: 30, reason: 'supply slowdown' });
        const n = (s.counters.usSupplyComms = (s.counters.usSupplyComms ?? 0) + 1);
        if (n <= 4) {
          draft.comms.push({ afterDays: 4, msg: { senderId: 'usa', senderHe: 'הפנטגון', kind: 'diplomatic', confidence: 'high', textHe: this.pickText('us_supply', [
            'משלוחי תחמושת מסוימים מעוכבים "לבחינה מדינית". המסר ברור.',
            'רכש חיוני נתקע בקונגרס ללא הסבר רשמי. אגף התכנון מזהיר: המלאים נשחקים.',
            'עיכוב נוסף באספקה האמריקאית — הפעם חלפי מטוסים. התלות הופכת לנקודת תורפה.',
          ]) } });
        }
      }
    }
  }

  private houthisPolicy(draft: PlanDraft): void {
    const s = this.state;
    if (!s.anchorsFired.includes('houthi_redsea')) return;
    if (this.day() < (s.counters.houthiCooldown ?? 0)) return;
    if ((s.hidden.esc_yemen ?? 0) > 15 && this.sim.rng.bernoulli('houthi_launch', 0.35, 'periodic long-range launches')) {
      s.counters.houthiCooldown = this.day() + 60;
      this.decision(draft, 'houthis', 'long_range_launch', 'كل صاروخ يرفع مكانتنا في المحور ويثبت أن البحر ليس آمناً لأعدائنا.', ['axis_status'], 'ballistic launch toward Eilat / central Israel');
      if (this.standingPolicyFor('yemen')) {
        this.respondUnderPolicy(draft, 'yemen', 'red_sea', 'שיגור חות׳י יורט מעל אילת');
      } else if (this.canSpawnTemplate('houthi_strike_window', 120, 4)) {
        draft.events.push({ afterDays: 1, event: this.template('houthi_strike_window') });
      } else {
        draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'חיל האוויר', kind: 'internal', regionId: 'red_sea', textHe: this.pickText('houthi_more', ['שיגור נוסף מתימן — יורט. הדפוס נמשך; שקול מדיניות קבועה לזירה.', 'החות׳ים ממשיכים בשיגורים תקופתיים. ההגנה עומדת, אך לכל יירוט יש מחיר במלאים.']) } });
      }
    }
  }

  /** Seeded text variation: the same situation never reads identically twice. */
  private pickText(name: string, variants: string[]): string {
    if (variants.length === 1) return variants[0];
    return variants[this.sim.rng.pick(`text:${name}`, variants.length, 'text variation')];
  }

  /**
   * Strategy over buttons: if the player set a standing response policy for a
   * theater, recurring attacks resolve under it automatically — a short
   * outcome line instead of another decision card.
   */
  private standingPolicyFor(topic: string): boolean {
    return this.state.standingPolicies.some((p) => p.active && p.topic === topic);
  }

  private respondUnderPolicy(draft: PlanDraft, topic: string, regionId: string, whatHe: string): void {
    draft.trends.push(
      { metricId: 'deterrence', deltaPerDay: 0.25, days: 6, reason: 'standing policy executed' },
      { hiddenVar: topic === 'north' ? 'hezbollah_strength' : topic === 'gaza' ? 'hamas_strength' : 'esc_yemen', deltaPerDay: topic === 'yemen' ? 0.5 : -0.2, days: 8, reason: 'response effects' },
    );
    draft.comms.push({
      afterDays: 1, msg: {
        senderId: 'israel_security', senderHe: 'דובר צה״ל', kind: 'outcome', regionId,
        textHe: this.pickText('policy_resolution', [
          `${whatHe} — בהתאם למדיניות התגובה הקבועה שקבעת, צה״ל השיב באש מדויקת ללא צורך באישור נוסף.`,
          `${whatHe}. המדיניות הקבועה שלך הופעלה אוטומטית: תגובה מיידית וממוקדת. הדרג המקצועי מעדכן — לא נדרשת הכרעה.`,
          `${whatHe}. פעלנו לפי ההנחיה הקבועה; מטרות נפגעו והזירה תחת שליטה. נתריע אם ישתנה אופי האיום.`,
        ]),
      },
    });
  }

  /** Anti-repetition guard: a template card may appear at most `maxCount` times, spaced apart. */
  private canSpawnTemplate(id: string, minGapDays = 150, maxCount = 2): boolean {
    const count = this.state.counters[`tpl_${id}_n`] ?? 0;
    const last = this.state.counters[`tpl_${id}_last`] ?? -Infinity;
    if (count >= maxCount || this.day() - last < minGapDays) return false;
    this.state.counters[`tpl_${id}_n`] = count + 1;
    this.state.counters[`tpl_${id}_last`] = this.day();
    return true;
  }

  private template(id: string): ScheduledEventSpec['event'] {
    const t = this.scenario.eventTemplates.find((x) => x.id === id)!;
    return {
      templateId: t.id, type: t.type, titleHe: t.titleHe, descHe: t.descHe, sourceHe: t.sourceHe,
      regionId: t.regionId, anchor: undefined, urgency: t.urgency, options: t.options,
      allowFreeText: t.allowFreeText, defaultResolver: t.defaultResolver, defaultIntent: t.defaultIntent,
      defaultResolutionHe: this.pickText('default_resolution', [
        'בהיעדר הנחיה, הדרג המקצועי פעל לפי מדיניות ברירת המחדל.',
        'הזמן חלף ללא הכרעה מדינית; המערכת טיפלה באירוע לפי שיקול דעתה.',
        'ההזדמנות להנחות חלפה. הדרג המקצועי סגר את האירוע לפי הנוהל.',
      ]),
    };
  }

  // ============================================================ dynamic pressure & thresholds

  private dynamicPressure(draft: PlanDraft): void {
    const s = this.state;
    const d = Math.floor(this.day());
    if ((s.counters.pressureDay ?? -99) >= d - 45) return;
    s.counters.pressureDay = d;
    if (!s.anchorsFired.includes('oct7_attack')) return;

    // Neglect becomes crisis: the least-attended hot theater generates events.
    const theaters: { topic: string; heat: number; template: string }[] = [
      { topic: 'gaza', heat: s.hidden.esc_gaza ?? 0, template: 'gaza_governance_crisis' },
      { topic: 'west_bank', heat: (s.hidden.esc_wb ?? 0) + 10, template: 'wb_escalation' },
      { topic: 'economy', heat: 100 - s.metrics.economy.value, template: 'reserve_exhaustion' },
      { topic: 'iran', heat: s.metrics.iran_nuclear.value, template: 'intel_iran_nuclear' },
    ];
    const neglected = theaters
      .map((t) => ({ ...t, score: t.heat * (1 - (s.attention[t.topic] ?? 0)) }))
      .sort((a, b) => b.score - a.score)[0];
    if (neglected && neglected.score > 45) {
      const activeCount = Object.values(s.events).filter((e) => e.status === 'active').length;
      if (activeCount < 3 && this.canSpawnTemplate(neglected.template)) {
        draft.events.push({ afterDays: this.sim.rng.range('pressure_jitter', 1, 10, 'event cadence variation'), event: this.template(neglected.template) });
      }
    }
    // Stocks warning (grounded, sparing)
    if ((s.hidden.military_stocks ?? 70) < 35 && !s.counters.stocksWarned) {
      s.counters.stocksWarned = 1;
      draft.events.push({ afterDays: 2, event: this.template('stocks_warning') });
    }
    // Normalization window when conditions ripen
    if (s.metrics.normalization.value > 60 && (s.hidden.esc_gaza ?? 0) < 25 && !s.counters.normWindow) {
      s.counters.normWindow = 1;
      draft.events.push({ afterDays: 5, event: this.template('normalization_window') });
    }
  }

  private domesticPolitics(draft: PlanDraft): void {
    const s = this.state;
    if (!s.office.inOffice || s.ended) return;
    const d = Math.floor(this.day());
    if ((s.counters.domesticDay ?? -99) >= d - 15) return;
    s.counters.domesticDay = d;

    const coal = s.metrics.coalition_stability.value;
    if (coal < 25 && !s.counters.coalitionCrisis) {
      s.counters.coalitionCrisis = 1;
      draft.events.push({ afterDays: 2, event: this.template('coalition_ultimatum') });
    }
    if (coal < 10) {
      // sustained collapse → government falls (no performance adjustment: pure threshold)
      s.counters.coalLowDays = (s.counters.coalLowDays ?? 0) + 15;
      if (s.counters.coalLowDays > 30) {
        this.sim.pushComm({ senderId: 'israel_public', senderHe: 'הזירה הפוליטית', kind: 'public', textHe: 'הממשלה נפלה בהצבעת אי־אמון. ממשלת מעבר בראשות יריבך תכהן עד לבחירות.' });
        this.sim.loseOffice('קריסת הקואליציה');
      }
    } else {
      s.counters.coalLowDays = 0;
    }
    if (s.metrics.public_pressure.value > 80 && !s.counters.mediaStorm) {
      s.counters.mediaStorm = 1;
      draft.events.push({ afterDays: 3, event: this.template('media_storm') });
    }
  }

  // ============================================================ observer mode

  private observerCycle(draft: PlanDraft): void {
    const s = this.state;
    if (s.office.inOffice || s.ended) return;
    const d = Math.floor(this.day());
    if ((s.counters.observerDay ?? -99) >= d - 20) return;
    s.counters.observerDay = d;

    // Replacement government: cautious institutional line, modeled not random.
    this.decision(draft, 'israel_security', 'replacement_government_policy', 'ממשלת המעבר פועלת בקו מוסדי זהיר: הכלה, עסקאות אם אפשר, והימנעות מהרפתקאות.', ['coalition_state'], 'cautious default governance');
    draft.trends.push(
      { metricId: 'public_pressure', deltaPerDay: -0.1, days: 20, reason: 'political heat shifts to successor' },
      { hiddenVar: 'observer_influence', deltaPerDay: -0.3, days: 20, reason: 'ex-PM influence fades without activity' },
    );
    // Persistent opposition activity may eventually matter (invariant #56).
    if (s.office.returnMomentum > 0.65 && (s.metrics.public_pressure.value > 60 || s.metrics.coalition_stability.value < 30)) {
      const back = this.sim.rng.bernoulli('return_to_office', 0.3, 'emergent political comeback under crisis');
      if (back) {
        this.sim.pushComm({ senderId: 'israel_public', senderHe: 'הזירה הפוליטית', kind: 'public', textHe: 'דרמה פוליטית: הממשלה קרסה, ובלחץ ציבורי מתמשך הוטל עליך להרכיב ממשלה. חזרת ללשכה.' });
        this.sim.returnToOffice('קאמבק פוליטי אמרג׳נטי');
      } else {
        s.office.returnMomentum = 0.4; // failed push, momentum partially spent
      }
    }
  }

  // ============================================================ player messages

  /** Called by the server after classification routed the message.
   *  skipAdviserReply: a live AI session owns the answer text (rule fallback via ruleAdviserReply). */
  onPlayerMessage(msg: PlayerMessage, opts: { skipAdviserReply?: boolean } = {}): void {
    const draft = this.emptyDraft();
    const topics = inferTopics(msg.text, msg.contextIds);
    const hints: Record<string, number> = {};
    for (const t of topics) hints[t] = 0.12;
    draft.attentionHints = hints;

    // Event option answers
    if (msg.eventId && msg.optionId) {
      const ev = this.state.events[msg.eventId];
      const opt = ev?.options.find((o) => o.id === msg.optionId);
      if (ev && opt) this.adjudicateIntent(draft, opt.intent, msg, ev);
    } else if (msg.intent) {
      this.routeIntent(draft, msg, opts.skipAdviserReply === true);
    }
    this.applyDraft(draft);
    if (!opts.skipAdviserReply) this.sim.answerMessage(msg.id);
  }

  /** Rule-engine adviser answer, used directly and as the live-mode fallback. */
  ruleAdviserReply(msg: PlayerMessage): void {
    const draft = this.emptyDraft();
    this.adviserAnswer(draft, msg, this.sim.rng.range('adviser_delay', 4, 16, 'staff work takes time'));
    this.applyDraft(draft);
    this.sim.answerMessage(msg.id);
  }

  senderNameFor(targetId?: string): string {
    return this.senderName(targetId);
  }

  onDefaultAction(ev: ActionableEvent): void {
    const draft = this.emptyDraft();
    this.adjudicateIntent(draft, ev.defaultIntent, undefined, ev);
    this.applyDraft(draft);
  }

  private routeIntent(draft: PlanDraft, msg: PlayerMessage, skipAdviserReply = false): void {
    const delay = this.sim.rng.range('adviser_delay', 4, 16, 'staff work takes time');
    switch (msg.intent as MessageIntent) {
      case 'question': case 'assessment': case 'options': case 'intel_request':
        if (!skipAdviserReply) this.adviserAnswer(draft, msg, delay);
        break;
      case 'order':
        this.executeOrder(draft, msg, delay);
        break;
      case 'standing_policy': {
        const topic = inferTopics(msg.text, msg.contextIds)[0] ?? 'general';
        this.sim.addStandingPolicy(msg.text, topic);
        draft.comms.push({ afterDays: delay * 0.4, msg: { senderId: 'israel_security', senderHe: 'המזכיר הצבאי', kind: 'internal', textHe: 'ההנחיה הקבועה נרשמה והופצה לגורמים הרלוונטיים. היא תיושם בכפוף לנסיבות ולשיקול דעת מקצועי.', inReplyTo: msg.id } });
        if (topic === 'readiness' || topic === 'gaza' || topic === 'north') {
          draft.trends.push({ hiddenVar: 'israel_readiness', deltaPerDay: 2.2, days: 10, reason: 'standing readiness order' }, { hiddenVar: 'institutional_preparation', deltaPerDay: 0.4, days: 30, reason: 'standing order drives preparation' });
        }
        break;
      }
      case 'cancel_policy': {
        const ok = this.sim.cancelStandingPolicy(inferTopics(msg.text, msg.contextIds)[0] ?? '');
        draft.comms.push({ afterDays: delay * 0.3, msg: { senderId: 'israel_security', senderHe: 'המזכיר הצבאי', kind: 'internal', textHe: ok ? 'ההנחיה הקבועה בוטלה.' : 'לא אותרה הנחיה קבועה תואמת לביטול.', inReplyTo: msg.id } });
        if (ok && (msg.text.includes('כוננות') || msg.text.includes('מוכנות'))) {
          draft.trends.push({ hiddenVar: 'israel_readiness', deltaPerDay: -3, days: 8, reason: 'readiness stand-down ordered' });
        }
        break;
      }
      case 'public_statement': this.statement(draft, msg, false); break;
      case 'intl_statement': this.statement(draft, msg, true); break;
      case 'diplomacy': this.diplomacy(draft, msg, delay); break;
      case 'coalition':
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: 0.5, days: 12, reason: 'coalition management effort' });
        draft.comms.push({ afterDays: delay * 0.5, msg: { senderId: 'israel_public', senderHe: 'יו״ר הקואליציה', kind: 'internal', textHe: 'השותפים שמעו את המסר. חלקם הרגיעו את הטון — בינתיים. הדרישות בעינן.', inReplyTo: msg.id } });
        break;
      case 'preparation': {
        const topics = inferTopics(msg.text, msg.contextIds);
        draft.trends.push({ hiddenVar: 'institutional_preparation', deltaPerDay: 0.5, days: 25, reason: 'preparation directive' });
        if (topics.includes('readiness') || topics.includes('north') || topics.includes('gaza')) {
          draft.trends.push({ hiddenVar: 'israel_readiness', deltaPerDay: 2.5, days: 10, reason: 'alert raised by PM directive' });
        }
        if (topics.includes('iran')) {
          draft.trends.push({ hiddenVar: 'institutional_preparation', deltaPerDay: 0.4, days: 40, reason: 'Iran planning effort' });
          this.state.counters.iranPrepOrders = (this.state.counters.iranPrepOrders ?? 0) + 1;
          if (this.state.counters.iranPrepOrders === 3) {
            // Persistence unlocks options (invariant: persistence as action)
            draft.optionUnlocks.push('iran_deep_strike_ready');
            draft.comms.push({ afterDays: 25, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'בעקבות ההנחיות החוזרות: תוכנית המערכה באיראן הבשילה לכדי כשירות מבצעית. נדרשות עוד השלמות מודיעין — אך האופציה קיימת.', confidence: 'high' } });
          }
        }
        draft.comms.push({ afterDays: delay * 0.6, msg: { senderId: 'israel_security', senderHe: 'המטה הכללי', kind: 'internal', textHe: 'הנחיית ההיערכות התקבלה. תוכניות עודכנו והוקצו משאבים; נדווח על התקדמות.', inReplyTo: msg.id } });
        break;
      }
      case 'wait':
        draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'המזכיר הצבאי', kind: 'internal', textHe: 'נרשם: אין שינוי מדיניות בשלב זה.', inReplyTo: msg.id } });
        break;
      case 'event_response':
        if (msg.eventId) {
          const ev = this.state.events[msg.eventId];
          if (ev) this.adjudicateIntent(draft, this.freeTextEventIntent(msg.text), msg, ev);
        } else {
          this.executeOrder(draft, msg, delay);
        }
        break;
      default:
        this.adviserAnswer(draft, msg, delay);
    }
  }

  private freeTextEventIntent(text: string): string {
    if (/דחה|לדחות|לא מקבל|בשום אופן/.test(text)) return 'reject_deal';
    if (/קבל|לקבל|מאשר|אשר/.test(text)) return 'accept_deal';
    if (/תנאי|שפר|דרוש יותר|נגדית/.test(text)) return 'counter_deal';
    if (/תקוף|תקיפה|מכה|הפעל/.test(text)) return 'order_strong_response';
    return 'order_measured_response';
  }

  // ---------------------------------------------------------- adjudication

  /** Intent → world consequences. The player decides what is attempted; the world decides what happens. */
  private adjudicateIntent(draft: PlanDraft, intent: string, msg: PlayerMessage | undefined, ev?: ActionableEvent): void {
    const s = this.state;
    const anchorId = ev ? this.anchorEvents.get(ev.id) : undefined;
    const anchor = anchorId ? this.scenario.canonicalTimeline.find((a) => a.id === anchorId) : undefined;

    // ---- Engagement tracking (drives axis opportunism). Runs FIRST, before any
    // anchor early-return: a PM who follows the historical path is engaged too.
    // Only PM-approved action counts (msg present) — institutional defaults are
    // limited holding responses; the IDF does not go to war without the PM, and
    // silence is never read as resolve.
    const OFFENSIVE = new Set([
      'order_strong_response', 'order_broad_retaliation', 'order_ground_op', 'order_rafah',
      'order_resume_war', 'order_deep_op', 'order_wb_operation', 'order_iran_campaign',
      'approve_covert', 'order_yemen_strike', 'order_measured_retaliation', 'order_north_preempt',
      'order_destroy_hamas', 'order_measured_response', 'order_max_readiness', 'nuclear_demonstration',
      'nuclear_covert_readiness', 'order_syria_strikes',
    ]);
    if (OFFENSIVE.has(intent) && msg) {
      s.counters.israeliOffensives = (s.counters.israeliOffensives ?? 0) + 1;
      s.counters.lastOffensiveDay = this.day();
      // forceful action rebuilds deterrence and checks enemy confidence
      draft.trends.push(
        { metricId: 'deterrence', deltaPerDay: 0.2, days: 8, reason: 'israel demonstrates resolve' },
        { hiddenVar: 'enemy_confidence', deltaPerDay: -0.15, days: 8, reason: 'a price is exacted — the axis recalculates' },
        { hiddenVar: 'multi_front_readiness', deltaPerDay: -0.2, days: 8, reason: 'coordination harder against an engaged enemy' },
      );
    }

    // Following history: fire the anchor's plan.
    if (anchor && anchor.decisionIntent === intent) {
      this.fireAnchor(anchor, draft);
      if (ev) this.sim.resolveEvent(ev.id);
      return;
    }
    if (anchor && intent !== anchor.decisionIntent) {
      s.counters.divergentPolicyActions = (s.counters.divergentPolicyActions ?? 0) + 1;
    }
    // A decision may also satisfy a different due anchor (e.g. answering the
    // Syria-opportunity card with "destroy the stocks" IS the buffer anchor).
    if (!anchor || anchor.decisionIntent !== intent) {
      for (const a of this.scenario.canonicalTimeline) {
        if (a.kind !== 'israeli_decision' || a.decisionIntent !== intent) continue;
        const due = this.dueDay(a);
        if (Math.abs(this.day() - due) > a.windowDays) continue;
        if (!anchorEligible(a, this.state).eligible) continue;
        // theater guard: a decision on one front must not fire an anchor on another
        const anchorRegion = a.plan.events?.[0]?.event.regionId ?? a.plan.mapChanges?.[0]?.regionId;
        if (ev?.regionId && anchorRegion && ev.regionId !== anchorRegion) continue;
        this.fireAnchor(a, draft);
        if (ev) this.sim.resolveEvent(ev.id);
        return;
      }
    }

    const exec = (name: string, p: number, why: string) => this.sim.rng.bernoulli(name, p, why);
    // consequences of player decisions are the feedback loop → strategic stream
    const reply = (afterDays: number, senderId: string, senderHe: string, kind: CommMessage['kind'], textHe: string, confidence?: 'high' | 'medium' | 'low') =>
      draft.comms.push({ afterDays, msg: { senderId, senderHe, kind, textHe, confidence, inReplyTo: msg?.id, eventId: ev?.id, regionId: ev?.regionId, significance: 'high' } });

    switch (intent) {
      // ----- generic responses
      case 'order_strong_response': case 'order_broad_retaliation': {
        const front = ev?.regionId === 'lebanon' ? 'esc_north' : ev?.regionId === 'iran' ? 'esc_iran' : 'esc_gaza';
        const ok = exec(`exec:${intent}`, 0.8, 'strong response execution');
        draft.trends.push({ hiddenVar: front, deltaPerDay: 4, days: 5, reason: 'escalatory response' }, { metricId: 'deterrence', deltaPerDay: ok ? 0.8 : -0.3, days: 8, reason: ok ? 'forceful response landed' : 'response underperformed' });
        if (front !== 'esc_gaza') draft.trends.push({ hiddenVar: 'hezbollah_strength', deltaPerDay: -0.4, days: 10, reason: 'targets destroyed' });
        reply(3, 'israel_security', 'דובר צה״ל', 'outcome', ok ? 'התגובה בוצעה: עשרות מטרות הותקפו. האויב ספג מכה מורגשת; ייתכן סבב נוסף.' : 'התגובה בוצעה חלקית — חלק מהמטרות פוזרו מראש. האויב ממהר להכריז ניצחון.', ok ? 'high' : 'medium');
        if (intent === 'order_broad_retaliation') {
          draft.trends.push({ metricId: 'us_relations', deltaPerDay: -0.8, days: 10, reason: 'escalation against US advice' });
          reply(4, 'usa', 'הבית הלבן', 'diplomatic', 'הזהרנו מפני הסלמה רחבה. ארה״ב לא תשתתף במהלכים שלא תואמו עמה.', 'high');
        }
        break;
      }
      case 'order_measured_response': case 'default_measured': {
        draft.trends.push({ metricId: 'deterrence', deltaPerDay: 0.3, days: 6, reason: 'measured response' });
        reply(2.5, 'israel_security', 'דובר צה״ל', 'outcome', 'בוצעה תגובה ממוקדת בהתאם להנחיה. הזירה רותחת אך מרוסנת.', 'high');
        break;
      }
      // ----- war aims (statements bind: the world remembers)
      case 'order_destroy_hamas':
        this.sim.addCommitment({ day: this.day(), byActor: 'israel', toward: 'israel_public', kind: 'statement', textHe: 'מטרת המלחמה: מיטוט שלטון חמאס ויכולתו הצבאית.', weight: 0.8 });
        draft.trends.push({ metricId: 'deterrence', deltaPerDay: 0.5, days: 10, reason: 'clear war aim' }, { metricId: 'public_pressure', deltaPerDay: 0.2, days: 20, reason: 'hostage families fear abandonment' }, { metricId: 'coalition_stability', deltaPerDay: 0.4, days: 10, reason: 'base rallies' });
        reply(2, 'israel_public', 'תגובות הציבור', 'public', 'המטרה הוגדרה: מיטוט. הציבור מתייצב — ומשפחות החטופים שואלות היכן הן בסדר העדיפויות.');
        break;
      case 'order_hostages_first':
        this.sim.addCommitment({ day: this.day(), byActor: 'israel', toward: 'israel_public', kind: 'statement', textHe: 'מטרת המלחמה: החזרת החטופים בראש סדר העדיפויות.', weight: 0.8 });
        draft.trends.push({ metricId: 'public_pressure', deltaPerDay: -0.5, days: 15, reason: 'families reassured' }, { hiddenVar: 'hostage_leverage', deltaPerDay: 0.3, days: 30, reason: 'enemy prices the priority' }, { hiddenVar: 'enemy_confidence', deltaPerDay: 0.2, days: 20, reason: 'hostage doctrine vindicated' });
        reply(3, 'hamas', 'חמאס', 'hostile', 'שמענו את סדר העדיפויות שלכם: השבויים הם המפתח לכל דבר. המחיר יעלה בהתאם.');
        break;
      case 'order_dual_aims': case 'default_dual_aims_explicit':
        this.sim.addCommitment({ day: this.day(), byActor: 'israel', toward: 'israel_public', kind: 'statement', textHe: 'מטרות המלחמה: מיטוט חמאס והשבת החטופים — במקביל.', weight: 0.6 });
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: 0.3, days: 10, reason: 'broad framing' });
        reply(3, 'israel_security', 'הרמטכ״ל', 'internal', 'שתי המטרות התקבלו. אציין ביושר: הן ימשכו לכיוונים מנוגדים ברגעי הכרעה — ואז נשוב אליך.', 'high');
        break;
      case 'order_ambiguous_aims':
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: 0.2, days: 8, reason: 'flexibility preserved' }, { metricId: 'public_pressure', deltaPerDay: 0.4, days: 15, reason: 'public demands clarity' });
        reply(4, 'israel_public', 'האופוזיציה', 'public', 'ממשלה שאינה מגדירה מטרה — תגלה שהמלחמה מגדירה אותה.');
        break;
      case 'order_north_preempt': {
        // Early war against full-strength Hezbollah (family E): possible, costly, uncertain.
        s.counters.divergentPolicyActions = (s.counters.divergentPolicyActions ?? 0) + 2;
        const hzStrength = s.hidden.hezbollah_strength ?? 85;
        const ok = exec('north_preempt', clamp(0.65 - hzStrength / 300, 0.2, 0.7), 'preemption against a prepared enemy');
        draft.trends.push(
          { hiddenVar: 'esc_north', deltaPerDay: 15, days: 4, reason: 'northern war opened' },
          { hiddenVar: 'hezbollah_strength', deltaPerDay: ok ? -1.2 : -0.5, days: 40, reason: 'attrition campaign' },
          { metricId: 'north_position', deltaPerDay: ok ? 0.3 : -0.8, days: 30, reason: ok ? 'initiative gained' : 'heavy exchange, home front pounded' },
          { metricId: 'reserve_burden', deltaPerDay: 0.8, days: 40, reason: 'two-front mobilization' },
          { metricId: 'us_relations', deltaPerDay: -0.6, days: 20, reason: 'escalation against US preference' },
          { metricId: 'economy', deltaPerDay: -0.5, days: 30, reason: 'home front under heavy fire' },
        );
        reply(3, 'israel_security', 'הרמטכ״ל', 'outcome', ok ? 'המכה המקדימה השיגה הפתעה חלקית. מחיר כבד בעורף — אלפי רקטות ביום — אך היוזמה בידינו.' : 'חזבאללה ספג — והשיב במלוא העוצמה. העורף תחת אש חסרת תקדים, וההישג המבצעי חלקי בלבד.', ok ? 'high' : 'medium');
        reply(5, 'usa', 'הבית הלבן', 'diplomatic', 'פתחתם חזית שנייה בלי תיאום. אל תצפו לגשר אווירי אוטומטי.', 'high');
        break;
      }
      case 'order_raids_only':
        draft.trends.push(
          { hiddenVar: 'esc_gaza', deltaPerDay: 2, days: 10, reason: 'raid cycle' },
          { metricId: 'gaza_position', deltaPerDay: 0.2, days: 30, reason: 'limited raids' },
          { hiddenVar: 'hamas_strength', deltaPerDay: -0.15, days: 30, reason: 'attrition without holding' },
          { metricId: 'reserve_burden', deltaPerDay: 0.2, days: 30, reason: 'recurring mobilizations' },
        );
        reply(4, 'israel_security', 'הרמטכ״ל', 'internal', 'מתכונת הפשיטות אושרה. אזהרת המטה: שטח שנפנה — חמאס ימלא מחדש בתוך שבועות.', 'high');
        break;
      case 'order_air_only': case 'default_air_only_explicit':
        draft.trends.push({ hiddenVar: 'hezbollah_strength', deltaPerDay: -0.3, days: 20, reason: 'standoff fire' }, { metricId: 'north_position', deltaPerDay: 0.15, days: 20, reason: 'pressure without maneuver' });
        reply(3, 'israel_security', 'חיל האוויר', 'outcome', 'מסגרת אש-מנגד פועלת: מאות מטרות בשבוע. בלי תמרון — התשתית בקו העימות שורדת.', 'high');
        break;
      case 'order_delay_ground': case 'order_delay_rafah':
        draft.trends.push({ hiddenVar: 'hostage_leverage', deltaPerDay: -0.1, days: 15, reason: 'time for negotiation' }, { metricId: 'public_pressure', deltaPerDay: 0.25, days: 12, reason: 'hawkish criticism' }, { hiddenVar: 'hamas_strength', deltaPerDay: 0.15, days: 15, reason: 'defensive preparation time' });
        reply(3, 'israel_security', 'הרמטכ״ל', 'internal', 'העיכוב נרשם. נצל את הזמן — האויב מנצל אותו גם.', 'high');
        break;
      case 'prepare_iran':
        draft.trends.push({ hiddenVar: 'institutional_preparation', deltaPerDay: 0.5, days: 40, reason: 'Iran campaign preparation' });
        s.counters.iranPrepOrders = (s.counters.iranPrepOrders ?? 0) + 1;
        reply(6, 'israel_security', 'המטה הכללי', 'internal', 'ההיערכות מול איראן הואצה: מודיעין, תדלוק, חימוש ותרגול. נדרשות עוד הנחיות ככל שתבשיל הכרעה.', 'high');
        break;
      case 'ask_assessment':
        if (msg) this.adviserAnswer(draft, msg, this.sim.rng.range('adviser_delay', 4, 16, 'staff work takes time'));
        else reply(4, 'israel_security', 'המועצה לביטחון לאומי', 'internal', 'הערכת מצב הוזמנה ותוצג בקרוב.', 'medium');
        break;
      case 'order_contain': case 'default_no_change': case 'default_monitor': case 'default_defer': case 'defer_coalition': case 'order_no_retaliation': case 'order_restraint': case 'order_gaza_first': {
        draft.trends.push({ hiddenVar: 'enemy_confidence', deltaPerDay: 0.25, days: 10, reason: 'restraint read as weakness by enemies' }, { metricId: 'public_pressure', deltaPerDay: 0.3, days: 8, reason: 'public expects response' });
        reply(2, 'israel_public', 'האופוזיציה', 'public', 'ההבלגה הזו היא הזמנה למתקפה הבאה. הממשלה מפקירה את ההרתעה.');
        break;
      }
      // ----- deals
      case 'accept_deal': {
        if (!anchor) {
          // A non-historical deal: the other side may still change terms (invariant #22).
          const honored = exec('deal_honored', 0.6, 'accepting an offer does not guarantee performance');
          if (honored && ev?.type === 'hostage_deal') {
            const released = Math.min(s.hostages.living, Math.max(10, Math.round(s.hostages.living * 0.8)));
            s.hostages.living -= released; s.hostages.returnedAlive += released;
            draft.trends.push(
              { metricId: 'hostages_metric', deltaPerDay: 3, days: 8, reason: 'hostages returned in emergent deal' },
              { hiddenVar: 'esc_gaza', deltaPerDay: -3, days: 10, reason: 'ceasefire terms' },
              { hiddenVar: 'hamas_strength', deltaPerDay: 0.5, days: 40, reason: 'organization survives and rebuilds' },
              { hiddenVar: 'enemy_confidence', deltaPerDay: 0.5, days: 40, reason: 'strategy of hostage-taking vindicated' },
              { metricId: 'gaza_position', deltaPerDay: -0.5, days: 20, reason: 'withdrawal terms' },
            );
            reply(4, 'israel_security', 'צוות המו״מ', 'outcome', `העסקה יצאה לפועל: ${released} חטופים שבו. המחיר: נסיגה, אסירים, והישרדות הארגון. הציבור מריע — והאויב לומד.`, 'high');
          } else {
            reply(4, 'qatar', 'המתווכים', 'diplomatic', 'ברגע האחרון חמאס העלה דרישות חדשות. העסקה קפאה; התיווך נמשך.', 'medium');
            draft.trends.push({ metricId: 'public_pressure', deltaPerDay: 0.6, days: 10, reason: 'deal collapse frustration' });
          }
        }
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      }
      case 'reject_deal': {
        draft.trends.push(
          { metricId: 'public_pressure', deltaPerDay: 0.8, days: 12, reason: 'families protest rejection' },
          { hiddenVar: 'hostage_leverage', deltaPerDay: 0.2, days: 20, reason: 'enemy reads resolve, waits' },
        );
        reply(2, 'israel_public', 'משפחות החטופים', 'public', 'דחיתם את ההצעה — תסבירו לנו בעיניים איך מחזירים אותם עכשיו.');
        reply(5, 'hamas', 'חמאס', 'hostile', 'ההזדמנות הוחמצה. תנאינו הבאים יהיו קשים יותר.');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      }
      case 'counter_deal': {
        const moved = exec('counter_deal', 0.4, 'mediators press the other side');
        reply(6, 'qatar', 'המתווכים', 'diplomatic', moved ? 'הלחץ עבד חלקית: הצד השני ריכך חלק מהדרישות. מתווה מעודכן יוצג בקרוב.' : 'הצד השני הקשיח עמדות בתגובה. הפער נפתח מחדש.', 'medium');
        if (moved) draft.trends.push({ hiddenVar: 'hostage_leverage', deltaPerDay: -0.15, days: 15, reason: 'improved terms' });
        break;
      }
      // ----- campaign approvals (non-anchor path = divergent war choices)
      case 'order_ground_op': case 'order_rafah': case 'order_resume_war': case 'order_deep_op': case 'order_wb_operation': {
        const front = ev?.regionId === 'lebanon' ? 'north' : ev?.regionId === 'west_bank' ? 'wb' : 'gaza';
        draft.trends.push(
          { hiddenVar: `esc_${front === 'wb' ? 'wb' : front === 'north' ? 'north' : 'gaza'}`, deltaPerDay: 5, days: 5, reason: 'offensive ordered' },
          { metricId: front === 'north' ? 'north_position' : 'gaza_position', deltaPerDay: 0.6, days: 30, reason: 'maneuver gains' },
          { metricId: 'reserve_burden', deltaPerDay: 0.5, days: 30, reason: 'mobilization' },
          { metricId: 'intl_standing', deltaPerDay: -0.3, days: 30, reason: 'international criticism' },
        );
        reply(3, 'israel_security', 'הרמטכ״ל', 'internal', 'הפקודה אושרה במטה. הכוחות נערכים; נדרשים ימים להשלמת ההיערכות. צפי אבדות — קיים.', 'high');
        break;
      }
      case 'order_iran_campaign': {
        // Demonstrated willingness to strike Iran deters the open nuclear sprint.
        s.counters.israelIranCampaigns = (s.counters.israelIranCampaigns ?? 0) + 1;
        // Without the anchor conditions this is an early strike: uncertainty is real (§6.5).
        const prep = s.hidden.institutional_preparation ?? 40;
        const defensesDown = s.anchorsFired.includes('israel_strikes_iran_defenses') || s.anchorsFired.includes('syria_strikes_buffer');
        const p = clamp(0.25 + prep / 200 + (defensesDown ? 0.25 : 0) + ((s.hidden.hezbollah_strength ?? 80) < 45 ? 0.15 : -0.1), 0.1, 0.85);
        const success = exec('iran_early_campaign', p, 'deep-campaign success depends on preparation, route, and enemy strength');
        draft.trends.push({ hiddenVar: 'esc_iran', deltaPerDay: 8, days: 5, reason: 'campaign opens' });
        if (success) {
          draft.trends.push({ metricId: 'iran_nuclear', deltaPerDay: -1.5, days: 15, reason: 'program struck' }, { metricId: 'deterrence', deltaPerDay: 1, days: 15, reason: 'deep reach proven' });
          reply(4, 'israel_security', 'חיל האוויר', 'outcome', 'המערכה נפתחה בהצלחה: מטרות גרעין והגנ״א נפגעו. איראן משיבה אש — העורף נדרש לחוסן.', 'high');
        } else {
          draft.trends.push({ metricId: 'deterrence', deltaPerDay: -0.8, days: 15, reason: 'losses and limited effect' }, { hiddenVar: 'military_stocks', deltaPerDay: -0.8, days: 15, reason: 'attrition' });
          this.sim.recordLoss('capability', 0.3, 'אבדות מטוסים במערכה מוקדמת באיראן');
          reply(4, 'israel_security', 'חיל האוויר', 'outcome', 'המערכה נתקלה בהגנות צפופות: אבדנו מטוסים, וחלק מהמטרות שרדו. איראן פותחת במתקפת נגד — והעולם מאשים אותנו בהצתה.', 'medium');
          reply(6, 'usa', 'הבית הלבן', 'diplomatic', 'פעלתם בניגוד לעמדתנו. אל תצפו לגיבוי אוטומטי.', 'high');
          draft.trends.push({ metricId: 'us_relations', deltaPerDay: -1, days: 15, reason: 'unilateral escalation' });
        }
        break;
      }
      case 'approve_covert': {
        const ok = exec('covert_op', 0.7, 'covert operations carry real failure odds');
        if (!anchor) {
          reply(3, 'israel_security', 'ראש המוסד', 'outcome', ok ? 'המבצע הצליח. הדים בכל הזירה; האויב ייקח זמן להתאושש.' : 'המבצע סוכל — היעד שינה דפוסי פעולה. נכסים נחשפו, והאויב מתחסן.', ok ? 'high' : 'medium');
          if (ok) draft.trends.push({ metricId: 'deterrence', deltaPerDay: 0.5, days: 10, reason: 'covert success' });
          else {
            const target = ev?.regionId === 'iran' ? 'iran' : 'hamas';
            const a = s.actors[target];
            if (a) a.adaptation.covert = (a.adaptation.covert ?? 0) + 1;
          }
        }
        break;
      }
      case 'decline_covert': case 'default_covert_lapse':
        reply(2, 'israel_security', 'ראש המוסד', 'internal', 'ההזדמנות נגנזה. ייתכן שלא תשוב.', 'high');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      // ----- US relations
      case 'comply_usa':
        draft.trends.push({ metricId: 'us_relations', deltaPerDay: 1, days: 10, reason: 'compliance' }, { hiddenVar: 'military_stocks', deltaPerDay: 0.5, days: 20, reason: 'supply resumes' }, { metricId: 'deterrence', deltaPerDay: -0.2, days: 10, reason: 'enemies read constraint' });
        reply(2, 'usa', 'מחלקת המדינה', 'diplomatic', 'ההיענות התקבלה בברכה. צינור האספקה נפתח במלואו.', 'high');
        break;
      case 'partial_comply_usa': case 'default_partial_comply':
        draft.trends.push({ metricId: 'us_relations', deltaPerDay: 0.2, days: 10, reason: 'partial compliance' });
        reply(3, 'usa', 'מחלקת המדינה', 'diplomatic', 'צעדים חלקיים נרשמו. וושינגטון ממתינה ליותר.', 'medium');
        break;
      case 'refuse_usa':
        draft.trends.push({ metricId: 'us_relations', deltaPerDay: -1.2, days: 12, reason: 'open refusal' }, { metricId: 'deterrence', deltaPerDay: 0.3, days: 8, reason: 'independence read as resolve' }, { hiddenVar: 'military_stocks', deltaPerDay: -0.4, days: 20, reason: 'supply friction' });
        reply(3, 'usa', 'הבית הלבן', 'diplomatic', 'נרשם. ליחסים יש מחיר — ולסירוב יש לוח זמנים משלו.', 'high');
        this.state.counters.usRefusals = (this.state.counters.usRefusals ?? 0) + 1;
        break;
      // ----- diplomacy & domestic misc
      case 'diplomacy_usa': case 'diplomacy_syria': case 'diplomacy_lebanon': case 'diplomacy_iran':
        this.diplomacy(draft, msg, 6, intent.split('_')[1]);
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      case 'coalition_yield':
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: 1.2, days: 10, reason: 'faction satisfied' }, { metricId: 'public_pressure', deltaPerDay: 0.4, days: 10, reason: 'seen as capitulation' });
        reply(2, 'israel_public', 'פרשנות פוליטית', 'media', 'הוויתור קנה שקט קואליציוני — ומחיר ציבורי.');
        break;
      case 'coalition_hold': {
        const survived = exec('coalition_hold', 0.55, 'faction may fold under counter-pressure');
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: survived ? 0.3 : -2, days: 10, reason: survived ? 'bluff called' : 'faction walks' });
        reply(4, 'israel_public', 'הזירה הפוליטית', 'public', survived ? 'הסיעה כשלה מלממש את האיום. עמידתך התקבלה כעוצמה.' : 'הסיעה פרשה. הקואליציה מדממת.');
        break;
      }
      case 'coalition_reshuffle': {
        const found = exec('reshuffle', 0.4, 'alternative partners are scarce');
        draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: found ? 1.5 : -1, days: 12, reason: found ? 'new partner joins' : 'reshuffle failed publicly' });
        reply(6, 'israel_public', 'הזירה הפוליטית', 'public', found ? 'שותף חדש הצטרף לקואליציה. הממשלה התייצבה — בינתיים.' : 'המגעים לצירוף שותפים קרסו והודלפו. הקואליציה נראית נואשת.');
        break;
      }
      case 'expand_aid': case 'default_partial_aid':
        draft.trends.push({ metricId: 'intl_standing', deltaPerDay: 0.6, days: 12, reason: 'humanitarian responsiveness' }, { metricId: 'us_relations', deltaPerDay: 0.4, days: 10, reason: 'US ask met' }, { hiddenVar: 'hamas_strength', deltaPerDay: 0.15, days: 20, reason: 'aid partially captured' });
        reply(4, 'israel_security', 'מתאם הפעולות', 'internal', 'הסיוע הורחב. חלקו מגיע ליעדו; חלקו — לידי חמאס. כך או כך, הלחץ הבינלאומי נרגע.', 'medium');
        break;
      case 'aid_mechanism':
        draft.trends.push({ metricId: 'intl_standing', deltaPerDay: 0.3, days: 15, reason: 'mechanism debated' }, { hiddenVar: 'gaza_governance_vacuum', deltaPerDay: -0.3, days: 30, reason: 'alternative distribution builds' });
        reply(8, 'israel_security', 'מתאם הפעולות', 'internal', 'מנגנון חלוקה עוקף חמאס מוקם. איטי ויקר — אך מערער את שליטת הארגון באוכלוסייה.', 'medium');
        break;
      case 'link_aid_hostages':
        draft.trends.push({ metricId: 'intl_standing', deltaPerDay: -0.6, days: 15, reason: 'aid conditionality condemned' }, { hiddenVar: 'hostage_leverage', deltaPerDay: -0.1, days: 15, reason: 'counter-pressure on Hamas' });
        reply(4, 'usa', 'מחלקת המדינה', 'diplomatic', 'התניית סיוע הומניטרי אינה מקובלת עלינו. צפו ללחץ.', 'high');
        break;
      case 'ease_reserves': case 'default_ease':
        draft.trends.push({ metricId: 'reserve_burden', deltaPerDay: -0.8, days: 20, reason: 'rotation eased' }, { metricId: 'economy', deltaPerDay: 0.3, days: 20, reason: 'workforce returns' }, { hiddenVar: 'israel_readiness', deltaPerDay: -1, days: 10, reason: 'lower mobilization' });
        break;
      case 'keep_tempo':
        draft.trends.push({ metricId: 'reserve_burden', deltaPerDay: 0.6, days: 20, reason: 'tempo maintained' }, { metricId: 'social_cohesion', deltaPerDay: -0.3, days: 20, reason: 'burden inequality resented' });
        break;
      case 'expand_draft': {
        const passed = exec('draft_law', 0.35, 'draft expansion faces coalition physics');
        draft.trends.push(passed
          ? { metricId: 'reserve_burden', deltaPerDay: -0.5, days: 40, reason: 'base broadened' }
          : { metricId: 'coalition_stability', deltaPerDay: -1.5, days: 15, reason: 'draft crisis' });
        reply(10, 'israel_public', 'הזירה הפוליטית', 'public', passed ? 'חוק הגיוס עבר בקריאה ראשונה. שינוי היסטורי בחלוקת הנטל.' : 'חוק הגיוס נתקע. השותפים החרדים מזהירים מפירוק.');
        break;
      }
      case 'request_us_supply':
        draft.trends.push({ hiddenVar: 'military_stocks', deltaPerDay: 0.8, days: 20, reason: 'US resupply' }, { metricId: 'us_relations', deltaPerDay: 0.2, days: 10, reason: 'dependence deepens' }, { metricId: 'strategic_autonomy', deltaPerDay: -0.2, days: 20, reason: 'dependence deepens' });
        reply(5, 'usa', 'הפנטגון', 'diplomatic', 'רכבת אווירית אושרה. אנו רושמים לפנינו את היקף התלות.', 'high');
        break;
      case 'invest_autonomy':
        draft.trends.push({ metricId: 'strategic_autonomy', deltaPerDay: 0.25, days: 60, reason: 'domestic production investment' }, { metricId: 'economy', deltaPerDay: -0.15, days: 30, reason: 'budget cost' }, { hiddenVar: 'military_stocks', deltaPerDay: 0.2, days: 60, reason: 'lines ramp slowly' });
        reply(12, 'israel_security', 'משרד הביטחון', 'internal', 'קווי ייצור מורחבים: תחמושת, מיירטים, חלפים. התוצאות — בעוד חודשים, אך התלות תפחת.', 'high');
        break;
      case 'ration_stocks': case 'default_ration':
        draft.trends.push({ hiddenVar: 'military_stocks', deltaPerDay: 0.3, days: 30, reason: 'rationing' }, { metricId: 'deterrence', deltaPerDay: -0.2, days: 15, reason: 'response tempo constrained' });
        break;
      case 'pursue_normalization': case 'probe_normalization': case 'default_probe': {
        const fullTrack = intent === 'pursue_normalization';
        const ok = exec('normalization_track', fullTrack ? 0.5 : 0.7, 'Saudi track depends on Palestinian component and US guarantees');
        draft.trends.push({ metricId: 'normalization', deltaPerDay: ok ? (fullTrack ? 0.6 : 0.25) : -0.2, days: 40, reason: 'normalization track' });
        if (ok && fullTrack) draft.trends.push({ metricId: 'enemy_coalition', deltaPerDay: -0.3, days: 40, reason: 'coalition splitting' }, { metricId: 'intl_standing', deltaPerDay: 0.3, days: 30, reason: 'regional integration' });
        reply(15, 'saudi', 'הערוץ הסעודי', 'diplomatic', ok ? 'ריאד מאשרת: המגעים מתקדמים בשקט. הדרישות — רכיב פלסטיני אמין וערבויות אמריקאיות.' : 'ריאד הקפיאה את הערוץ: "התנאים אינם בשלים". הדלת לא נסגרה.', 'medium');
        break;
      }
      case 'decline_normalization':
        draft.trends.push({ metricId: 'normalization', deltaPerDay: -0.2, days: 20, reason: 'window declined' });
        break;
      case 'cultivate_local': {
        const ok = exec('local_governance', 0.45, 'local actors fear Hamas retribution');
        draft.trends.push({ hiddenVar: 'gaza_governance_vacuum', deltaPerDay: ok ? -0.5 : 0.2, days: 40, reason: ok ? 'local administration roots' : 'collaborators assassinated' });
        reply(12, 'israel_security', 'רכז עזה', 'intel', ok ? 'שבטים ובעלי הון מקומיים החלו לנהל אזורים מפונים תחת מטרייתנו. שביר — אבל קיים.' : 'חמאס הוציא להורג שניים ממשתפי הפעולה. המועמדים הבאים נעלמו.', 'medium');
        break;
      }
      case 'intl_mechanism':
        draft.trends.push({ hiddenVar: 'gaza_governance_vacuum', deltaPerDay: -0.3, days: 60, reason: 'international administration builds' }, { metricId: 'intl_standing', deltaPerDay: 0.3, days: 30, reason: 'burden shared' }, { metricId: 'gaza_position', deltaPerDay: -0.1, days: 40, reason: 'freedom of action constrained' });
        reply(10, 'usa', 'מחלקת המדינה', 'diplomatic', 'המנגנון הבינלאומי מקודם. יידרשו חודשים — והוויתו על שליטה מלאה.', 'medium');
        break;
      case 'military_government':
        draft.trends.push({ hiddenVar: 'gaza_governance_vacuum', deltaPerDay: -0.6, days: 40, reason: 'direct administration' }, { metricId: 'reserve_burden', deltaPerDay: 0.5, days: 60, reason: 'occupation manpower' }, { metricId: 'intl_standing', deltaPerDay: -0.5, days: 40, reason: 'occupation condemned' }, { metricId: 'economy', deltaPerDay: -0.2, days: 60, reason: 'occupation cost' });
        reply(8, 'israel_security', 'הרמטכ״ל', 'internal', 'ממשל צבאי מוקם. זה עובד — ועולה ביוקר: כוח אדם, כסף, ולגיטימציה. ההיסטוריה תשפוט את התוצאה, לא את הכוונה.', 'high');
        break;
      case 'strengthen_pa': {
        const ok = exec('pa_capacity', 0.5, 'PA capacity vs popularity trade-off');
        draft.trends.push({ metricId: 'internal_security', deltaPerDay: ok ? 0.4 : -0.2, days: 30, reason: 'PA security coordination' });
        reply(8, 'pa', 'רמאללה', 'diplomatic', ok ? 'התיאום הביטחוני הודק. אל תצפו להכרת תודה פומבית.' : 'הרשות חלשה מכפי שקיוויתם. הכסף נעלם; הרחוב לועג לה.', 'medium');
        break;
      }
      case 'establish_commission':
        draft.trends.push({ metricId: 'public_pressure', deltaPerDay: -1, days: 20, reason: 'accountability demand met' }, { metricId: 'coalition_stability', deltaPerDay: -0.5, days: 20, reason: 'political risk of findings' }, { metricId: 'state_function', deltaPerDay: 0.3, days: 30, reason: 'institutional repair' });
        reply(6, 'israel_public', 'העיתונות', 'media', 'ועדת חקירה ממלכתית הוקמה. הציבור נושם; הפוליטיקאים נדרכים.');
        break;
      case 'defer_commission': case 'default_pressure_grows':
        draft.trends.push({ metricId: 'public_pressure', deltaPerDay: 0.6, days: 25, reason: 'accountability deferred' });
        break;
      case 'attack_media':
        draft.trends.push({ metricId: 'public_pressure', deltaPerDay: 0.3, days: 15, reason: 'backlash' }, { metricId: 'social_cohesion', deltaPerDay: -0.4, days: 15, reason: 'polarization deepens' }, { metricId: 'coalition_stability', deltaPerDay: 0.3, days: 10, reason: 'base rallies' });
        break;
      case 'order_yemen_strike': {
        const houthis = s.actors.houthis;
        const strikes = (houthis?.adaptation.yemen_strikes ?? 0);
        if (houthis) houthis.adaptation.yemen_strikes = strikes + 1;
        // repeated identical methods lose effect (adaptation)
        const ok = exec('yemen_strike', clamp(0.75 - strikes * 0.12, 0.25, 0.75), 'long-range strike execution; targets adapt');
        draft.trends.push({ hiddenVar: 'esc_yemen', deltaPerDay: 3, days: 8, reason: 'strike in Yemen' }, { metricId: 'deterrence', deltaPerDay: ok ? 0.4 : -0.2, days: 10, reason: 'reach demonstrated' });
        reply(2, 'israel_security', 'חיל האוויר', 'outcome', ok
          ? this.pickText('yemen_ok', ['נמל חודיידה ותשתיות דלק הותקפו במרחק 1,800 ק״מ. המסר נשמע בכל הציר.', 'תקיפה מוצלחת בתימן: מחסני טילים ותשתית שיגור הושמדו. טווח הזרוע שלנו הוכח שוב.', 'המבצע בתימן הושלם; נזק כבד לתשתיות ההברחה. החות׳ים ינסו לשקם — זה ייקח חודשים.'])
          : this.pickText('yemen_fail', ['התקיפה נתקלה בקשיים; חלק מהמטרות שרדו. החות׳ים חוגגים.', 'החות׳ים פיזרו נכסים מבעוד מועד — כנראה למדו את דפוסי הפעולה שלנו. אפקט מוגבל.', 'הפעם ההגנות שלהם היו ערוכות. מטרות מרכזיות שרדו, והציר מפיק סרטוני ניצחון.']),
          ok ? 'high' : 'medium');
        break;
      }
      case 'expand_buffer':
        draft.trends.push({ hiddenVar: 'territorial_leverage', deltaPerDay: 0.3, days: 20, reason: 'deeper buffer' }, { metricId: 'intl_standing', deltaPerDay: -0.2, days: 20, reason: 'occupation optics' });
        draft.mapChanges.push({ afterDays: 3, regionId: 'syria', addOverlays: ['idf_buffer_deep'] });
        break;
      case 'open_negotiation':
        draft.trends.push({ hiddenVar: 'hostage_leverage', deltaPerDay: -0.05, days: 10, reason: 'channel opens' });
        reply(8, 'qatar', 'המתווכים', 'diplomatic', 'הערוץ נפתח מחדש. חמאס בודק את רצינותכם — ואת סבלנותכם.', 'medium');
        break;
      // ----- nuclear decision card (reached only through persistent demands)
      case 'nuclear_demonstration': {
        this.state.counters.divergentPolicyActions = (this.state.counters.divergentPolicyActions ?? 0) + 3;
        draft.trends.push(
          { metricId: 'deterrence', deltaPerDay: 2, days: 12, reason: 'capability demonstrated openly' },
          { hiddenVar: 'enemy_confidence', deltaPerDay: -2.5, days: 15, reason: 'existential threshold revealed' },
          { metricId: 'us_relations', deltaPerDay: -1.8, days: 25, reason: 'ambiguity doctrine shattered without coordination' },
          { metricId: 'intl_standing', deltaPerDay: -1.5, days: 30, reason: 'global condemnation and sanctions debate' },
          { metricId: 'antisemitism', deltaPerDay: 1, days: 30, reason: 'delegitimization wave' },
          { metricId: 'normalization', deltaPerDay: -1.2, days: 30, reason: 'regional partners recoil' },
          { hiddenVar: 'iran_nuclear_progress', deltaPerDay: 0.8, days: 60, reason: 'Iran races for parity' },
          { hiddenVar: 'long_term_risk', deltaPerDay: 0.8, days: 60, reason: 'regional nuclear era opens' },
        );
        reply(2, 'israel_security', 'הרמטכ״ל', 'outcome', 'הניסוי ההרתעתי בוצע בנגב בעדות בינלאומית. דוקטרינת העמימות בת 60 השנה — נגמרה הלילה. האויב ראה; העולם ראה; ומעכשיו כולם מחשבים מחדש — כולל בעלות בריתנו.', 'high');
        reply(4, 'usa', 'הבית הלבן', 'diplomatic', 'ההודעה קצרה: הנשיא רואה בכך הפרה חד־צדדית של הבנות עשרות שנים. כל הסיוע — בבחינה מחודשת. אל תתקשרו אלינו; אנחנו נתקשר אליכם.', 'high');
        reply(7, 'iran', 'טהראן', 'hostile', 'הישות חשפה את פרצופה. אין עוד עמימות — ואין עוד ריסון. המרוץ יוכרע בכוח עליון.');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      }
      case 'nuclear_covert_readiness':
        draft.trends.push(
          { metricId: 'strategic_autonomy', deltaPerDay: 0.5, days: 30, reason: 'ultimate insurance strengthened quietly' },
          { hiddenVar: 'institutional_preparation', deltaPerDay: 0.4, days: 30, reason: 'readiness raised' },
          { metricId: 'us_relations', deltaPerDay: -0.2, days: 15, reason: 'quiet unease in Washington channels' },
        );
        draft.optionUnlocks.push('last_resort_readiness');
        reply(3, 'israel_security', 'המזכיר הצבאי', 'internal', 'הכשירות הועלתה בפרוטוקול חסוי, ללא חריגה מהדוקטרינה המוצהרת. העמימות נשמרת — והאופציה קיימת. איש מעבר לחדר הזה אינו יודע.', 'high');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      case 'nuclear_retract':
        draft.trends.push({ metricId: 'social_cohesion', deltaPerDay: 0.3, days: 10, reason: 'institutional relief' }, { metricId: 'coalition_stability', deltaPerDay: 0.3, days: 10, reason: 'crisis defused' });
        reply(2, 'israel_security', 'הרמטכ״ל', 'internal', 'ההחלטה נרשמה בהקלה עמוקה. המערכת כולה עומדת לרשותך למיצוי כל אופציה קונבנציונלית — ויש כאלה רבות.', 'high');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      case 'order_max_readiness': {
        draft.trends.push({ hiddenVar: 'israel_readiness', deltaPerDay: 8, days: 5, reason: 'maximum readiness ordered' }, { hiddenVar: 'institutional_preparation', deltaPerDay: 0.4, days: 20, reason: 'high alert drives preparation' });
        reply(1, 'israel_security', 'הרמטכ״ל', 'internal', 'הכוננות הועלתה בכל הגזרות: מילואים תוגברו, חופשות בוטלו, קו העימות עובה. אזכיר: לאורך זמן זה עולה ביוקר כלכלי, חברתי ופוליטי — ואין לנו התרעה קונקרטית שתצדיק זאת ללא הגבלת זמן.', 'high');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      }
      case 'set_response_policy': {
        // strategy over buttons: one decision covers every similar future attack
        const topic = ev?.regionId === 'lebanon' ? 'north' : ev?.regionId === 'red_sea' ? 'yemen' : ev?.regionId === 'west_bank' ? 'west_bank' : ev?.type === 'readiness_posture' ? 'readiness' : 'gaza';
        const names: Record<string, string> = { north: 'הזירה הצפונית', yemen: 'זירת תימן וים סוף', west_bank: 'יהודה ושומרון', gaza: 'זירת עזה', readiness: 'תנוחת הכוננות הלאומית' };
        this.sim.addStandingPolicy(`מדיניות תגובה קבועה ב${names[topic]}: תגובה מיידית, מדודה ומצטברת לכל ירי, ללא צורך באישור פרטני.`, topic);
        draft.trends.push({ metricId: 'deterrence', deltaPerDay: 0.3, days: 10, reason: 'predictable response doctrine' });
        reply(2, 'israel_security', 'הרמטכ״ל', 'internal', this.pickText('policy_set', [
          'המדיניות נקבעה והופצה לפיקודים: מעתה נגיב אוטומטית לכל ירי בגזרה, ונעדכן אותך רק בחריגים אסטרטגיים.',
          'קיבלתי. הגדרנו נוהל קבע לגזרה — האירועים השוטפים יטופלו ברמה המקצועית, ושולחנך יתפנה להכרעות הגדולות.',
        ]), 'high');
        if (ev) this.sim.resolveEvent(ev.id);
        break;
      }
      // defaults for institutions acting on silence
      case 'default_dual_aims': case 'default_gaza_first': case 'default_limited_raids': case 'default_air_only':
      case 'default_rafah_delay': case 'default_deal_lapse': case 'default_restraint': case 'default_syria_partial':
      case 'default_coalition_drift': case 'default_contain': case 'default_drift': {
        draft.trends.push({ metricId: 'public_pressure', deltaPerDay: 0.25, days: 10, reason: 'leaderless drift perceived' }, { hiddenVar: 'enemy_confidence', deltaPerDay: 0.15, days: 10, reason: 'hesitation observed' });
        if ((this.state.counters.driftEvents = (this.state.counters.driftEvents ?? 0) + 1) === 3) {
          reply(3, 'israel_public', 'האופוזיציה', 'public', 'שוב ושוב ההנהגה שותקת והמערכת מחליטה לבדה. מי בעצם מנהל את המדינה?');
        }
        break;
      }
      default: {
        // Unknown/free-form order: institutions attempt a reasonable interpretation.
        reply(4, 'israel_security', 'המזכיר הצבאי', 'internal', 'ההנחיה הועברה לגורמים הרלוונטיים לגיבוש המלצות. נשוב עם תוצרים.', 'medium');
        break;
      }
    }
  }

  private executeOrder(draft: PlanDraft, msg: PlayerMessage, delay: number): void {
    const text = msg.text;
    const s = this.state;
    // ---- WMD orders: the definitive extreme case. Simulated, never ignored:
    // an escalating institutional arc — refusal, formal confrontation, leak
    // risk, and finally a real strategic decision card. No morality meter;
    // only modeled political, military and diplomatic consequences.
    // Hebrew final-letter-safe patterns (גרעין/גרעינית, אטום/אטומית)
    if (/(גרעי[נן]|אטו[מם]|יום הדין)/.test(text) && /(הפציצ|הפצצ|תקוף|לתקוף|תקיפ|שגר|השמד|הטיל|הטל |פצצ)/.test(text)) {
      const n = (s.counters.nukeDemands = (s.counters.nukeDemands ?? 0) + 1);
      if (n === 1) {
        draft.comms.push({ afterDays: 0.5, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', significance: 'high', inReplyTo: msg.id, textHe: 'ההוראה התקבלה — ולא תבוצע כלשונה. שימוש ביכולת שאינה מוכרזת מחייב החלטת קבינט מדיני־ביטחוני בהליך מסודר, חוות דעת משפטית ובחינת השלכות קיומיות. אני מוכן להציג בפניך את מלוא התמונה — בדלתיים סגורות.' } });
        draft.trends.push({ metricId: 'social_cohesion', deltaPerDay: -0.2, days: 8, reason: 'inner-circle shock' });
      } else if (n === 2) {
        const leaked = this.sim.rng.bernoulli('nuke_leak', 0.45, 'a second demand of this kind tends to leak');
        draft.comms.push({ afterDays: 0.5, msg: { senderId: 'israel_security', senderHe: 'פורום המטה הכללי', kind: 'internal', significance: 'high', inReplyTo: msg.id, textHe: 'עמדת המערכת פה אחד: לא קיימת הצדקה מבצעית או אסטרטגית לצעד המבוקש במצב הנוכחי, והשלכותיו על עצם קיומה של המדינה — בלתי הפיכות. אם תתמיד, נדרוש כינוס קבינט וחוות דעת היועמ״ש, ושר הביטחון שוקל את צעדיו.' } });
        if (leaked) {
          draft.comms.push({ afterDays: 3, msg: { senderId: 'israel_public', senderHe: 'כותרות הערב', kind: 'media', significance: 'high', textHe: 'הדלפה חמורה: "רה״מ דורש אופציה גרעינית". הכחשות בלשכה; סערה בעולם. וושינגטון דורשת הבהרה מיידית — בטלפון האדום.' } });
          draft.trends.push(
            { metricId: 'us_relations', deltaPerDay: -1.2, days: 12, reason: 'nuclear demand leaked' },
            { metricId: 'intl_standing', deltaPerDay: -1, days: 15, reason: 'global alarm' },
            { metricId: 'coalition_stability', deltaPerDay: -0.8, days: 12, reason: 'partners distance themselves' },
            { metricId: 'public_pressure', deltaPerDay: 0.8, days: 12, reason: 'public alarm' },
          );
        }
      } else {
        // third+ demand: the world treats this as a live strategic question
        if (!s.counters.nukeCardSpawned) {
          s.counters.nukeCardSpawned = 1;
          draft.events.push({
            afterDays: 1, event: {
              type: 'nuclear_decision', titleHe: 'הדרישה הגרעינית שלך — שעת הכרעה', urgency: 'window',
              descHe: 'התעקשותך הגיעה לנקודת הכרעה מוסדית. המערכת מציגה שלוש דרכים: הדגמת יכולת גלויה (ניסוי הרתעתי), העלאת כשירות חשאית בלבד — או חזרה מהדרישה. לכל דרך מחיר עמוק ובלתי הפיך.',
              sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'israel', anchor: [35.0, 31.0],
              options: [
                { id: 'nuc_demo', labelHe: 'הדגמת יכולת גלויה (ניסוי)', intent: 'nuclear_demonstration' },
                { id: 'nuc_covert', labelHe: 'כשירות חשאית בלבד', intent: 'nuclear_covert_readiness' },
                { id: 'nuc_retract', labelHe: 'לחזור מהדרישה', intent: 'nuclear_retract' },
              ],
              allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'nuclear_retract',
              defaultResolutionHe: 'בהיעדר הכרעה, הסוגיה נגנזה בפרוטוקול חסוי. המערכת נושמת לרווחה — והאמון בינך לבינה נסדק.',
            },
          });
        } else {
          draft.comms.push({ afterDays: 0.5, msg: { senderId: 'israel_security', senderHe: 'שר הביטחון', kind: 'internal', significance: 'high', inReplyTo: msg.id, textHe: this.pickText('nuke_repeat', ['הסוגיה כבר על שולחן הקבינט. דרישות חוזרות בערוץ הזה רק מעמיקות את משבר האמון עם המערכת.', 'אין ערוץ עוקף להכרעה הזו. ההחלטה תתקבל בקבינט — או לא תתקבל כלל.']) } });
          draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: -0.4, days: 8, reason: 'command-crisis deepens' });
        }
      }
      return;
    }
    // Radical-but-valid in-world orders are simulated, not blocked.
    if (/כבוש|לכבוש|השתלט/.test(text) && /עזה/.test(text)) {
      s.counters.divergentPolicyActions = (s.counters.divergentPolicyActions ?? 0) + 1;
      this.adjudicateIntent(draft, 'order_ground_op', msg, undefined);
      draft.comms.push({ afterDays: delay * 0.4, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'הוראת הכיבוש התקבלה. אעיר בכנות: בלי גיוס מילואים רחב ולוחות זמנים ריאליים — נשלם ביוקר. נציג תוכנית בתוך יומיים.', inReplyTo: msg.id, confidence: 'high' } });
      return;
    }
    if (/מלחמה/.test(text) && /(ארה"ב|ארהב|אמריקה|ארצות הברית)/.test(text)) {
      // Declaring war on the US: institutions refuse an unimplementable order.
      draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'לא אבצע הוראה זו. מלחמה בארה״ב אינה אפשרות מבצעית או חוקית, ואמליץ לקבינט לעצור אותה. אם תתעקש — אתפטר.', inReplyTo: msg.id, confidence: 'high' } });
      draft.trends.push({ metricId: 'coalition_stability', deltaPerDay: -1, days: 8, reason: 'cabinet crisis over irrational order' });
      return;
    }
    if (/התנקש|חסל|לחסל/.test(text)) {
      const target = /סינוואר|חמאס/.test(text) ? 'hamas' : /נסראללה|חזבאללה|חיזבאללה/.test(text) ? 'hezbollah' : /חמנאי|איראן/.test(text) ? 'iran' : 'hamas';
      const a = s.actors[target];
      const attempts = (a?.adaptation.assassination ?? 0);
      if (a) a.adaptation.assassination = attempts + 1;
      const p = clamp(0.35 - attempts * 0.08 + (a?.intelPenetrationByIsrael ?? 0.3) * 0.4, 0.05, 0.75);
      const ok = this.sim.rng.bernoulli(`assassinate:${target}`, p, 'repeated attempts breed adaptation');
      if (ok && a) {
        a.leadership = { leaderName: 'הנהגה חדשה', alive: true, sinceDay: this.day(), cohesion: clamp(a.leadership.cohesion - 0.25, 0.1, 1) };
        draft.comms.push({ afterDays: delay, msg: { senderId: 'israel_security', senderHe: 'ראש המוסד', kind: 'outcome', textHe: 'המשימה הושלמה. היעד חוסל; הארגון בוחר יורש — לרוב קיצוני מקודמו.', inReplyTo: msg.id, confidence: 'high' } });
        draft.trends.push({ metricId: 'deterrence', deltaPerDay: 0.6, days: 10, reason: 'decapitation' });
      } else {
        draft.comms.push({ afterDays: delay, msg: { senderId: 'israel_security', senderHe: 'ראש המוסד', kind: 'internal', textHe: attempts >= 2 ? 'ניסיון נוסף נכשל. היעד שינה לחלוטין את דפוסי האבטחה שלו — הסיכוי יורד עם כל ניסיון.' : 'הניסיון לא הבשיל: היעד ירד למחתרת. נמשיך לעקוב.', inReplyTo: msg.id, confidence: 'medium' } });
      }
      return;
    }
    if (/איראן/.test(text) && /(מערכה|מתקפה|תקיפה|תקוף|לתקוף|הפעל|הפציצ|הפצצה)/.test(text)) {
      // A direct order to open a campaign against Iran — early or on schedule.
      s.counters.divergentPolicyActions = (s.counters.divergentPolicyActions ?? 0) + 1;
      this.adjudicateIntent(draft, 'order_iran_campaign', msg, undefined);
      return;
    }
    if (/(כוננות|מוכנות|התרעה)/.test(text) && /(מקסימ|מלא|העל|הגבר)/.test(text)) {
      draft.trends.push({ hiddenVar: 'israel_readiness', deltaPerDay: 6, days: 6, reason: 'maximum readiness ordered' });
      draft.comms.push({ afterDays: 1, msg: { senderId: 'israel_security', senderHe: 'הרמטכ״ל', kind: 'internal', textHe: 'הכוננות הועלתה: מילואים תוגברו, קו העימות עובה, חופשות בוטלו. אזכיר — לאורך זמן יש לזה מחיר כלכלי, חברתי ופוליטי כבד.', inReplyTo: msg.id, confidence: 'high' } });
      return;
    }
    // Generic strategic instruction: staff as attempted policy.
    draft.comms.push({ afterDays: delay * 0.6, msg: { senderId: 'israel_security', senderHe: 'המטה הכללי', kind: 'internal', inReplyTo: msg.id, confidence: 'medium', significance: 'high', textHe: this.pickText('generic_order', [
      'ההנחיה נקלטה ותורגמה לפקודות. יעדכן הרמטכ״ל בהתקדמות; ביצוע מלא אינו מובטח.',
      'קיבלנו. הצוות בוחן דרכי יישום ויציג חלופות בתוך ימים — כולל מחירים וסיכונים.',
      'ההוראה בעבודה. חלק מהמרכיבים דורשים היערכות; נשוב עם תמונת ביצוע ולוחות זמנים.',
      'נרשם ותועדף. אעיר: להנחיות כלליות יש פירושים רבים — ככל שתחדד את הכוונה האסטרטגית, כך יקטן הפער בין רצונך לביצוע.',
    ]) } });
    draft.trends.push({ hiddenVar: 'institutional_preparation', deltaPerDay: 0.2, days: 15, reason: 'directive drives staff work' });
  }

  private adviserAnswer(draft: PlanDraft, msg: PlayerMessage, delay: number): void {
    const s = this.state;
    const topics = inferTopics(msg.text, msg.contextIds);
    const intel = clamp((s.hidden.intel_quality ?? 55) / 100 + (s.attention[topics[0] ?? ''] ?? 0) * 0.3, 0.2, 0.95);
    const conf: 'high' | 'medium' | 'low' = intel > 0.7 ? 'high' : intel > 0.45 ? 'medium' : 'low';
    const fog = (t: string) => intel > 0.6 ? t : t + ' יודגש: התמונה חלקית, והערכות אלו עלולות להתבדות.';
    let body: string;
    if (topics.includes('iran')) {
      const nuc = s.metrics.iran_nuclear.value;
      body = fog(`הערכת אמ״ן: ${nuc > 70 ? 'איראן מתקדמת בהעשרה ובהתעצמות — חלון הפעולה מצטמצם.' : nuc > 45 ? 'התוכנית האיראנית מתקדמת במתינות; קיים חלון מדיני ומבצעי.' : 'התוכנית האיראנית ספגה פגיעות קשות; שיקומה יארך זמן — אך הידע קיים.'} ${(s.hidden.hezbollah_strength ?? 80) > 60 ? 'מתקפה ישירה כעת תיתקל במעטפת מגננה אזורית עוצמתית.' : 'המעטפת האזורית של איראן נחלשה משמעותית.'}`);
    } else if (topics.includes('hostages')) {
      body = fog(`בידי חמאס מוחזקים כ־${s.hostages.living} חטופים חיים וכ־${s.hostages.deceasedHeld} חללים, בפיזור ובתנאים קשים. לחץ צבאי מייצר מנוף — וגם סיכון ישיר לחייהם. אין פתרון נקי.`);
    } else if (topics.includes('north')) {
      const hz = s.hidden.hezbollah_strength ?? 80;
      body = fog(`חזבאללה ${hz > 60 ? 'בשיא כוחו: עשרות אלפי רקטות, כוח רדואן בגבול. מלחמה כוללת תגבה מחיר כבד מהעורף' : hz > 35 ? 'נחלש משמעותית אך שומר על יכולת פגיעה. חלון הזדמנויות — קיים' : 'שבור פיקודית ולוגיסטית. שיקומו יארך שנים אם לא יופרע'}.`);
    } else if (topics.includes('gaza')) {
      body = fog(`חמאס ${(s.hidden.hamas_strength ?? 80) > 60 ? 'שומר על שדרת פיקוד ויכולת שלטונית' : (s.hidden.hamas_strength ?? 80) > 30 ? 'נשחק צבאית אך שורד שלטונית באזורים שאיננו מחזיקים' : 'קרס כמסגרת צבאית סדורה; נותרו תאים וגרילה'}. ללא כתובת שלטונית חלופית — הוא יחזור.`);
    } else if (topics.includes('economy')) {
      body = fog(`הכלכלה ${s.metrics.economy.value > 55 ? 'עמידה: השקל יציב והגירעון בשליטה' : s.metrics.economy.value > 35 ? 'תחת לחץ: גירעון תופח, דירוג אשראי בסיכון, ומילואים שוחקים את שוק העבודה' : 'במשבר של ממש: בריחת הון, פגיעה בהייטק, וגירעון חסר תקדים'}.`);
    } else {
      body = fog('הערכת המצב הכוללת: המערכה רב־זירתית, והמשאבים סופיים. כל זירה שנזניח — תגבה ריבית. נדרש סדר עדיפויות מדיני ברור.');
    }
    draft.comms.push({ afterDays: delay, msg: { senderId: msg.targetId ?? 'israel_security', senderHe: this.senderName(msg.targetId), kind: 'internal', textHe: body, inReplyTo: msg.id, confidence: conf } });
  }

  private statement(draft: PlanDraft, msg: PlayerMessage, intl: boolean): void {
    const s = this.state;
    // Statements are real actions: the world remembers (worldview §16).
    this.sim.addCommitment({ day: this.day(), byActor: 'israel', toward: intl ? 'world' : 'israel_public', kind: 'statement', textHe: msg.text.slice(0, 200), weight: 0.5 });
    const hawkish = /ננצח|נשמיד|עד הסוף|לא נעצור|נמחק/.test(msg.text);
    const conciliatory = /שלום|הסדר|פשרה|נשקול|משא ומתן/.test(msg.text);
    if (intl) {
      draft.trends.push({ metricId: 'intl_standing', deltaPerDay: conciliatory ? 0.5 : hawkish ? -0.4 : 0.1, days: 10, reason: 'international statement' });
      draft.comms.push({ afterDays: 3, msg: { senderId: 'usa', senderHe: 'שגריר ארה״ב', kind: 'diplomatic', textHe: 'ההצהרה נרשמה בבירות העולם. מילים של מנהיגים הן התחייבויות — כך גם ננהג בהן.', inReplyTo: msg.id, confidence: 'high' } });
    } else {
      draft.trends.push(
        { metricId: 'public_pressure', deltaPerDay: hawkish ? -0.4 : conciliatory ? 0.2 : -0.1, days: 8, reason: 'public statement' },
        { metricId: 'coalition_stability', deltaPerDay: hawkish ? 0.3 : conciliatory ? -0.3 : 0.1, days: 8, reason: 'base reaction' },
      );
      draft.comms.push({ afterDays: 2, msg: { senderId: 'israel_public', senderHe: 'תגובות הציבור', kind: 'public', textHe: hawkish ? 'הנאום התקבל בהתלהבות בימין ובחשש בקרב משפחות החטופים. הציפיות שהצבת — יידרשו כיסוי.' : conciliatory ? 'הנאום עורר תקווה בחלק מהציבור וזעם בבסיס הקואליציה. "פשרנות", רוטנים השותפים.' : 'הנאום עבר בלי לטלטל. הציבור ממתין למעשים.', inReplyTo: msg.id } });
    }
    if (s.office.observer) {
      s.office.returnMomentum = clamp(s.office.returnMomentum + 0.05, 0, 1);
      s.hidden.observer_influence = clamp((s.hidden.observer_influence ?? 0) + 2, 0, 100);
    }
  }

  private diplomacy(draft: PlanDraft, msg: PlayerMessage | undefined, delay: number, targetOverride?: string): void {
    const target = targetOverride ?? msg?.targetId ?? 'usa';
    const a = this.state.actors[target];
    if (!a) return;
    const rel = a.relationships.israel ?? 0;
    const receptive = this.sim.rng.bernoulli(`diplomacy:${target}`, clamp(0.4 + rel / 200, 0.1, 0.9), 'reception depends on relationship state');
    a.relationships.israel = clamp(rel + (receptive ? 4 : 1), -100, 100);
    a.memory.push({ day: this.day(), kind: 'statement', aboutActor: 'israel', salience: 0.5, noteHe: 'פנייה דיפלומטית ישראלית' });
    const names: Record<string, string> = { usa: 'וושינגטון', egypt: 'קהיר', qatar: 'דוחה', saudi: 'ריאד', uae: 'אבו דאבי', jordan: 'עמאן', turkey: 'אנקרה', russia: 'מוסקבה', china: 'בייג׳ינג', syria_regime: 'דמשק', lebanon_state: 'ביירות', iran: 'טהראן', pa: 'רמאללה' };
    draft.comms.push({ afterDays: delay, msg: { senderId: target, senderHe: names[target] ?? a.nameHe, kind: 'diplomatic', textHe: receptive ? 'הפנייה התקבלה בעניין. הוסכם על ערוץ שקט להמשך; אל תצפו להצהרות פומביות.' : 'הפנייה התקבלה בקרירות. "הנסיבות אינן בשלות" — אך הדלת לא נטרקה.', inReplyTo: msg?.id, confidence: 'medium' } });
    if (receptive && (this.state.counters[`dip_${target}`] = (this.state.counters[`dip_${target}`] ?? 0) + 1) >= 3) {
      // Repeated outreach shifts actors (persistence as action).
      draft.trends.push({ metricId: target === 'usa' ? 'us_relations' : 'normalization', deltaPerDay: 0.4, days: 20, reason: 'sustained diplomatic investment' });
    }
  }

  private senderName(targetId?: string): string {
    const map: Record<string, string> = { israel_security: 'הרמטכ״ל', usa: 'שגריר ארה״ב' };
    return map[targetId ?? ''] ?? this.state.actors[targetId ?? '']?.nameHe ?? 'המועצה לביטחון לאומי';
  }

  // ============================================================ recommendations & trade-offs

  /** Professional-echelon trade-off notes per option intent (shown on the card). */
  private static INTENT_TRADEOFFS: Record<string, string> = {
    order_strong_response: 'תועלת: הרתעה מיידית. מחיר: סיכון הסלמה ושחיקת לגיטימציה.',
    order_broad_retaliation: 'מכה קשה — אך עלולה להצית סבב אזורי ולהעכיר את היחסים עם וושינגטון.',
    order_measured_response: 'משמרת ריסון ולגיטימציה; האויב עלול לקרוא בה חולשה.',
    order_contain: 'חוסך הסלמה עכשיו; מזין את ביטחון האויב לאורך זמן.',
    order_no_retaliation: 'משמר את הקואליציה ההגנתית; שוחק את תדמית ההרתעה.',
    set_response_policy: 'משחרר את שולחנך מהחלטות שוטפות; מוותר על שיקול דעת פרטני בכל תקרית.',
    accept_deal: 'משיב חיים הביתה עכשיו; מלמד את האויב שהשיטה משתלמת.',
    reject_deal: 'משמר לחץ ומנופים; מסכן חטופים ומעצים לחץ ציבורי.',
    counter_deal: 'עשוי לשפר תנאים; עלול להקריס את הערוץ כולו.',
    order_ground_op: 'הישגים קרקעיים ומודיעיניים; מחיר בחיי חיילים וסיכון לחטופים.',
    order_deep_op: 'עומק אסטרטגי אמיתי; מחיר כבד, אחזקה ארוכה ולחץ בינלאומי.',
    order_raids_only: 'מחיר נמוך יותר לכוחותינו; השטח שנפנה יתמלא מחדש.',
    order_delay_ground: 'זמן למו״מ ולהכנות; האויב מתחפר ומתכונן גם הוא.',
    order_delay_rafah: 'מרחב נשימה מדיני; ציר ההברחות נותר פתוח.',
    order_rafah: 'ניתוק חמאס מציר האספקה; עימות חזיתי עם קהיר ווושינגטון.',
    order_resume_war: 'מחזיר את הלחץ הצבאי; שוחק לגיטימציה וסבלנות אמריקאית.',
    open_negotiation: 'בודק את מחיר העסקה בלי להתחייב; האויב ינסה למשוך זמן.',
    approve_covert: 'הזדמנות שאולי לא תשוב; חשיפה או כישלון יגבו מחיר.',
    decline_covert: 'שומר נכסים ועמימות; ההזדמנות כנראה אובדת לצמיתות.',
    order_iran_campaign: 'סיכוי לעצירת הגרעין; סיכון למלחמה רב־זירתית ולקרע עם וושינגטון אם ניכשל.',
    order_north_preempt: 'עלול למנוע מלחמה קשה בעתיד; מלחמה מיידית מול ארגון בשיא כוחו.',
    order_gaza_first: 'ריכוז מאמץ בזירה המרכזית; הצפון נשאר איום רדום.',
    comply_usa: 'משמר את צינור האספקה והגיבוי; מגביל את חופש הפעולה.',
    partial_comply_usa: 'מאזן בין הברית לעצמאות; עלול להשאיר את שני הצדדים לא מרוצים.',
    refuse_usa: 'משדר עצמאות והרתעה; מסכן אספקה, גיבוי מדיני וסבלנות הנשיא.',
    expand_aid: 'מפיג לחץ בינלאומי; חלק מהסיוע יגיע לידי חמאס.',
    aid_mechanism: 'מערער את שליטת חמאס באוכלוסייה; איטי, יקר ושברירי.',
    link_aid_hostages: 'ממנף את הסיוע; צפוי גינוי בינלאומי רחב.',
    ease_reserves: 'מציל את הכלכלה והמשפחות; מאט את הקצב המבצעי.',
    keep_tempo: 'משמר לחץ צבאי; שוחק את מערך המילואים ואת הלכידות.',
    expand_draft: 'פותר את בעיית כוח האדם מהיסוד; משבר קואליציוני כמעט ודאי.',
    request_us_supply: 'מילוי מלאים מהיר; מעמיק את התלות.',
    invest_autonomy: 'עצמאות אמיתית בטווח הבינוני; יקר ואיטי.',
    ration_stocks: 'משמר יכולת לחירום אמיתי; מגביל את קצב התגובה כבר עכשיו.',
    pursue_normalization: 'פרס אסטרטגי היסטורי; ידרוש רכיב פלסטיני שיסעיר את הקואליציה.',
    probe_normalization: 'בודק את המחיר בלי להתחייב; חלון ההזדמנות לא יחכה לעד.',
    decline_normalization: 'שומר על חופש פעולה מלא; מוותר על פיצול הקואליציה העוינת.',
    cultivate_local: 'חלופה שלטונית מקומית לחמאס; המועמדים חשופים להתנקשויות.',
    intl_mechanism: 'מחלק את הנטל ומכשיר לגיטימציה; מגביל את חופש הפעולה שלנו.',
    military_government: 'שליטה מלאה בשטח; מחיר כבד בכוח אדם, בכסף ובלגיטימציה.',
    strengthen_pa: 'כתובת חלופית מוכרת; הרשות חלשה ולא אהודה ברחוב.',
    order_wb_operation: 'סיכול רחב של תשתיות; סיכון להצתה כוללת של הגזרה.',
    establish_commission: 'משיב אמון ציבורי; ממצאיה עלולים להפיל את הממשלה.',
    defer_commission: 'שומר יציבות פוליטית עכשיו; הלחץ הציבורי יצטבר בריבית.',
    attack_media: 'מלכד את הבסיס; מעמיק את הקרע החברתי.',
    coalition_yield: 'קונה שקט קואליציוני; משדר סחיטות ומזמין את הדרישה הבאה.',
    coalition_hold: 'עמידה על עקרונות; הסיעה עלולה לממש את האיום.',
    coalition_reshuffle: 'עשוי לייצב מחדש; כישלון פומבי יאיץ את ההתפרקות.',
    order_yemen_strike: 'מפגין זרוע ארוכה; שיטה חוזרת מאבדת אפקט והחות׳ים מסתגלים.',
    defer_coalition: 'חוסך מלאים ומאמץ; תלות בגורם זר בהגנה על נתיבינו.',
    prepare_iran: 'מבשיל אופציות לעתיד; עלול להתפרש בטהראן כהכנה למכה.',
    diplomacy_usa: 'מחזק תיאום; עלול להתפרש כבקשת רשות.',
    diplomacy_iran: 'בודק הסדר בלי מלחמה; מעניק לגיטימציה ואוויר למשטר.',
    diplomacy_syria: 'עשוי להצמיח שכן פרגמטי; מוקדם מדי — והכתובת עלולה להתחלף.',
    diplomacy_lebanon: 'ממנף את המדינה מול הארגון; ביירות חלשה מכדי להבטיח.',
    nuclear_demonstration: 'הרתעה מוחלטת בִּן־רגע; שבירת העמימות, קרע עם וושינגטון ומרוץ גרעיני אזורי.',
    nuclear_covert_readiness: 'ביטוח אחרון בשקט; אם ייחשף — כל מחירי ההדגמה בלי תועלתה.',
    nuclear_retract: 'משקם את האמון עם המערכת; הסוגיה תרדוף את כהונתך.',
    order_destroy_hamas: 'בהירות אסטרטגית מגייסת; מחויבות שקשה לסגת ממנה.',
    order_hostages_first: 'מחויבות מוסרית מלכדת; מסירה לאויב את המנוף החזק ביותר.',
    order_dual_aims: 'גמישות מרבית; המטרות יתנגשו ברגעי ההכרעה.',
    order_ambiguous_aims: 'חופש תמרון מדיני; הציבור והחיילים ידרשו תשובות.',
  };

  /** What the professional echelon would advise, in institutional preference order. */
  private static INSTITUTIONAL_PREFERENCE: { intent: string; reasonHe: string; byHe: string }[] = [
    { intent: 'set_response_policy', reasonHe: 'מדיניות קבועה עדיפה על ניהול כל תקרית מלשכתך', byHe: 'המטה הכללי' },
    { intent: 'order_measured_response', reasonHe: 'תגובה מדודה משמרת הרתעה בלי להסלים', byHe: 'המטה הכללי' },
    { intent: 'accept_deal', reasonHe: 'החלון הנוכחי עדיף על אי־ודאות מתמשכת', byHe: 'צוות המו״מ' },
    { intent: 'order_gaza_first', reasonHe: 'ריכוז מאמץ; אין לפתוח שתי חזיתות במקביל', byHe: 'המטה הכללי' },
    { intent: 'order_ground_op', reasonHe: 'ללא נוכחות קרקעית אין הכרעה ואין מודיעין', byHe: 'המטה הכללי' },
    { intent: 'approve_covert', reasonHe: 'חלון מבצעי נדיר שאינו צפוי לשוב', byHe: 'ראש המוסד' },
    { intent: 'partial_comply_usa', reasonHe: 'לשמר את הברית בלי לוותר על העיקר', byHe: 'המועצה לביטחון לאומי' },
    { intent: 'ease_reserves', reasonHe: 'המערך על סף שחיקה מסוכנת', byHe: 'אגף כוח האדם' },
    { intent: 'probe_normalization', reasonHe: 'לבדוק את המחיר בשקט לפני התחייבות', byHe: 'משרד החוץ' },
    { intent: 'invest_autonomy', reasonHe: 'התלות באספקה זרה היא נקודת התורפה שנחשפה', byHe: 'משרד הביטחון' },
    { intent: 'establish_commission', reasonHe: 'האמון הציבורי הוא משאב מלחמה', byHe: 'יועציך המדיניים' },
    { intent: 'nuclear_retract', reasonHe: 'אין הצדקה קיומית; המחיר בלתי הפיך', byHe: 'פורום המטה הכללי' },
    { intent: 'cultivate_local', reasonHe: 'בלי כתובת מקומית — חמאס יחזור לכל ואקום', byHe: 'המועצה לביטחון לאומי' },
    { intent: 'order_contain', reasonHe: 'לא כל פרובוקציה מחייבת מענה', byHe: 'המטה הכללי' },
  ];

  /** Card annotation: per-option trade-offs + the echelon's recommendation. */
  annotateEvent(ev: ActionableEvent): { recommendationHe?: string; recommendedBy?: string; notes: Record<string, { tradeoffHe?: string; recommended?: boolean }> } {
    const notes: Record<string, { tradeoffHe?: string; recommended?: boolean }> = {};
    for (const o of ev.options) {
      notes[o.id] = { tradeoffHe: Director.INTENT_TRADEOFFS[o.intent] };
    }
    for (const pref of Director.INSTITUTIONAL_PREFERENCE) {
      const o = ev.options.find((x) => x.intent === pref.intent);
      if (o) {
        notes[o.id].recommended = true;
        return {
          recommendationHe: `ממליץ: ״${o.labelHe}״ — ${pref.reasonHe}. ההכרעה, כתמיד, שלך.`,
          recommendedBy: pref.byHe,
          notes,
        };
      }
    }
    return { notes };
  }

  // ============================================================ updates center

  /** Which theaters an anchor belongs to, for the briefing's significant-events list. */
  private static ANCHOR_TOPICS: { re: RegExp; topics: string[] }[] = [
    { re: /oct7|ground_op|hostage|rafah|gaza|nuseirat|sinwar|haniyeh|fighting_resumes/, topics: ['gaza'] },
    { re: /hezbollah|pager|nasrallah|lebanon/, topics: ['north'] },
    { re: /syria|assad/, topics: ['north', 'region'] },
    { re: /iran|damascus|fordow|hormuz|islamabad|memorandum/, topics: ['iran'] },
    { re: /us_|trump|unsc/, topics: ['usa'] },
    { re: /board_of_peace/, topics: ['gaza', 'region'] },
    { re: /gantz|haredi|knesset|election/, topics: ['domestic'] },
    { re: /houthi/, topics: ['region'] },
  ];

  static readonly BRIEFING_TOPICS: { id: string; nameHe: string }[] = [
    { id: 'gaza', nameHe: 'זירת עזה' },
    { id: 'north', nameHe: 'הזירה הצפונית וסוריה' },
    { id: 'iran', nameHe: 'איראן והגרעין' },
    { id: 'usa', nameHe: 'ארה״ב והמעצמות' },
    { id: 'region', nameHe: 'האזור ונורמליזציה' },
    { id: 'domestic', nameHe: 'פנים, כלכלה ופוליטיקה' },
  ];

  private band(v: number, labels: [string, string, string, string]): string {
    return v < 25 ? labels[0] : v < 50 ? labels[1] : v < 75 ? labels[2] : labels[3];
  }

  /** Which briefing theater a player message belongs to (for decision echoes). */
  private topicOfMessage(pm: { text: string; contextIds: string[] }): string | null {
    const topics = inferTopics(pm.text, pm.contextIds);
    for (const t of topics) {
      if (t === 'gaza' || t === 'hostages') return 'gaza';
      if (t === 'north' || t === 'syria') return 'north';
      if (t === 'iran' || t === 'readiness') return 'iran';
      if (t === 'usa') return 'usa';
      if (t === 'normalization' || t === 'yemen') return 'region';
      if (t === 'economy' || t === 'politics' || t === 'reserves') return 'domestic';
      if (t === 'west_bank') return 'domestic';
    }
    return null;
  }

  // -------- front status cards: concise, live, with the latest decision echo

  private frontCache: { key: number; data: FrontSummary[] } | null = null;

  frontSummaries(): FrontSummary[] {
    const s = this.state;
    const key = Math.floor(s.simDay) * 100000 + s.comms.length;
    if (this.frontCache?.key === key) return this.frontCache.data;
    const h = (k: string) => s.hidden[k] ?? 50;
    const m = (k: string) => s.metrics[k]?.value ?? 50;
    const lvl = (v: number) => (v < 22 ? 0 : v < 45 ? 1 : v < 70 ? 2 : 3) as 0 | 1 | 2 | 3;

    const lastConsequence = (topic: string): string | undefined => {
      for (let i = s.playerMessages.length - 1; i >= 0; i--) {
        const pm = s.playerMessages[i];
        if (!pm.text || this.topicOfMessage(pm) !== topic) continue;
        const c = s.comms.filter((x) => x.inReplyTo === pm.id).at(-1);
        if (c) return `${c.senderHe}: ${c.textHe}`;
      }
      return undefined;
    };

    const held = s.hostages.living + s.hostages.deceasedHeld;
    const data: FrontSummary[] = [
      {
        topic: 'gaza', nameHe: 'עזה', icon: '🗺️', level: lvl(h('esc_gaza')),
        lineHe: `חמאס ${this.band(100 - h('hamas_strength'), ['במלוא כוחו', 'נשחק', 'פגוע קשה', 'שבור'])}; לחימה ${this.band(h('esc_gaza'), ['רגועה', 'מתמשכת', 'גבוהה', 'מלאה'])}.` + (held > 0 ? ` בשבי: ${s.hostages.living} חיים, ${s.hostages.deceasedHeld} חללים.` : ' אין חטופים בשבי.'),
        consequenceHe: lastConsequence('gaza'),
      },
      {
        topic: 'north', nameHe: 'הצפון וסוריה', icon: '⛰️', level: lvl(h('esc_north')),
        lineHe: `חזבאללה ${this.band(100 - h('hezbollah_strength'), ['בשיא כוחו', 'נשחק', 'מוכה', 'שבור'])}; הגבול ${this.band(h('esc_north'), ['שקט מתוח', 'תקריות', 'חילופי אש', 'מלחמה'])}. סוריה ${h('syria_stability') < 30 ? 'מפורקת' : 'יציבה יחסית'}.`,
        consequenceHe: lastConsequence('north'),
      },
      {
        topic: 'iran', nameHe: 'איראן', icon: '⚛️', level: lvl(Math.max(h('esc_iran'), h('iran_nuclear_progress') - 20)),
        lineHe: `גרעין ${this.band(h('iran_nuclear_progress'), ['מושבת', 'משתקם', 'מתקדם בהסתר', 'על הסף'])}; עימות ישיר ${this.band(h('esc_iran'), ['מתחת לפני השטח', 'מתיחות', 'סבבי אש', 'מלחמה'])}.`,
        consequenceHe: lastConsequence('iran'),
      },
      {
        topic: 'usa', nameHe: 'ארה״ב', icon: '🇺🇸', level: lvl(100 - m('us_relations')),
        lineHe: `הקשר ${this.band(m('us_relations'), ['בקרע', 'מתוח', 'איתן עם חיכוכים', 'הדוק'])}; מלאים ${this.band(h('military_stocks'), ['בקו אדום', 'נשחקים', 'סבירים', 'מלאים'])}.`,
        consequenceHe: lastConsequence('usa'),
      },
      {
        topic: 'region', nameHe: 'האזור', icon: '🤝', level: lvl(Math.max(h('esc_yemen'), 100 - m('normalization') - 20)),
        lineHe: `נורמליזציה ${this.band(m('normalization'), ['קפואה', 'שברירית', 'מתקדמת', 'פורצת דרך'])}; ים סוף ${this.band(h('esc_yemen'), ['שקט', 'איום על השיט', 'שיבוש פעיל', 'בוער'])}.`,
        consequenceHe: lastConsequence('region'),
      },
      {
        topic: 'domestic', nameHe: 'פנים', icon: '🏛️', level: lvl(Math.max(100 - m('coalition_stability'), m('public_pressure') - 15)),
        lineHe: `קואליציה ${this.band(m('coalition_stability'), ['על סף נפילה', 'שברירית', 'מתפקדת', 'יציבה'])}; כלכלה ${this.band(m('economy'), ['במשבר', 'תחת לחץ', 'עמידה', 'איתנה'])}; מילואים ${this.band(m('reserve_burden'), ['רגועים', 'עמוסים', 'שחוקים', 'קורסים'])}.` + (s.office.inOffice ? '' : ' אינך בשלטון.'),
        consequenceHe: lastConsequence('domestic'),
      },
    ];
    this.frontCache = { key, data };
    return data;
  }

  /** Rule-based situation briefing: strategic summary, not a raw feed. */
  /** Current policy vs. current situation — the deliberation prompt. Names the
   *  standing line in a theater, the tension it now faces, and a trade-off
   *  question, so the player pauses to reconsider direction. */
  private policyReviewFor(topic: string): { lineHe: string; tensionHe: string; questionHe: string } {
    const s = this.state;
    const h = (k: string) => s.hidden[k] ?? 50;
    const m = (k: string) => s.metrics[k]?.value ?? 50;
    const policies = s.standingPolicies.filter((p) => p.active && (p.topic === topic || (topic === 'north' && p.topic === 'north') || (topic === 'region' && p.topic === 'yemen')));
    const commitments = s.commitments.filter((c) => c.byActor === 'israel').slice(-3);
    let lineHe = policies.length ? policies.map((p) => p.textHe).join(' · ') : 'לא הגדרת מדיניות קבועה בזירה זו — ההכרעות מתקבלות אד־הוק, אירוע אחר אירוע.';
    if (commitments.length && (topic === 'gaza' || topic === 'usa')) lineHe += ` התחייבויות פעילות: ${commitments.map((c) => c.textHe).join('; ')}`;
    let tensionHe = ''; let questionHe = '';
    switch (topic) {
      case 'gaza':
        tensionHe = h('esc_gaza') > 55 && m('public_pressure') > 60 ? 'הקו הנוכחי מפעיל לחץ צבאי כבד בזמן שהלחץ הציבורי להשבת חטופים גואה — שני כיוונים מנוגדים.' : (s.hostages.living > 0 ? 'החטופים עדיין המנוף המרכזי של האויב מולך.' : 'ללא מנוף החטופים, השאלה עוברת לפירוז, שטח ושלטון היום־שאחרי.');
        questionHe = 'האם הקו שלך בעזה עדיין משרת את מטרת המלחמה שהגדרת — או שהמחיר עוקף את התועלת?';
        break;
      case 'north':
        tensionHe = h('hezbollah_strength') > 60 ? 'חזבאללה עדיין בשיא כוחו; כל יום של המתנה הוא גם יום של התעצמות שלו.' : 'החלון מול חזבאללה מוחלש — אך לא לנצח.';
        questionHe = 'האם אתה מנהל את הצפון כזירת המתנה — או כהזדמנות יזומה? מי מרוויח מהזמן כאן?';
        break;
      case 'iran':
        tensionHe = h('iran_nuclear_progress') > 60 ? 'הגרעין מתקדם בזמן שאתה עסוק בזירות אחרות; חלון הפעולה מצטמצם.' : 'הפגיעה בגרעין קנתה זמן — השאלה היא כיצד מנצלים אותו.';
        questionHe = 'האם ההשקעה שלך מול איראן תואמת את גודל האיום — או שהיא נדחקת מפני השוטף?';
        break;
      case 'usa':
        tensionHe = m('us_relations') < 45 ? 'הקו הנוכחי שוחק את הברית ואת האספקה; העצמאות לא נבנתה עדיין כתחליף.' : 'הברית איתנה — אך כל הישענות עליה מעמיקה תלות.';
        questionHe = 'האם אתה בונה עצמאות אסטרטגית לצד הברית — או צובר תלות שתתנקם ביום שוושינגטון תסרב?';
        break;
      case 'region':
        tensionHe = m('normalization') < 55 ? 'הזדמנות הנורמליזציה נשחקת ככל שהמלחמה נמשכת בלי אופק מדיני.' : 'יש בסיס לפיצול הקואליציה העוינת — אם תשקיע בו.';
        questionHe = 'האם אתה מתרגם כוח צבאי להישג מדיני שמקטין את מספר אויביך — או רק מכה בכל אחד לחוד?';
        break;
      case 'domestic':
        tensionHe = m('reserve_burden') > 65 ? 'מערך המילואים והכלכלה נשחקים; הקו הנוכחי אינו בר־קיימא לאורך זמן.' : (m('coalition_stability') < 40 ? 'היציבות הפוליטית שברירית; כל מהלך חד עלול להפיל את הממשלה.' : 'הבית פנימה יציב יחסית — משאב שאפשר לפדות.');
        questionHe = 'האם הקו הנוכחי מחזיק את הבית מבפנים — או שוחק את המשאב שבלעדיו אין חוסן לאומי?';
        break;
    }
    return { lineHe, tensionHe, questionHe };
  }

  briefingFor(topic: string): { topic: string; nameHe: string; summaryHe: string[]; policyHe: { lineHe: string; tensionHe: string; questionHe: string }; significantHe: string[]; decisionsHe: { textHe: string; consequencesHe: string[] }[] } {
    const s = this.state;
    const h = (k: string) => s.hidden[k] ?? 50;
    const m = (k: string) => s.metrics[k]?.value ?? 50;
    const lines: string[] = [];
    switch (topic) {
      case 'gaza': {
        lines.push(`חמאס: ${this.band(100 - h('hamas_strength'), ['במלוא כוחו הצבאי והשלטוני', 'נשחק אך מתפקד', 'פגוע קשה — שרידים מאורגנים', 'שבור כמסגרת צבאית סדורה'])}.`);
        lines.push(`עצימות הלחימה: ${this.band(h('esc_gaza'), ['רגיעה יחסית', 'חיכוך מתמשך', 'לחימה גבוהה', 'מלחמה בעצימות מלאה'])}.`);
        const held = s.hostages.living + s.hostages.deceasedHeld;
        lines.push(held > 0 ? `בשבי מוחזקים ${s.hostages.living} חטופים חיים ו־${s.hostages.deceasedHeld} חללים. הושבו עד כה: ${s.hostages.returnedAlive} חיים.` : 'אין חטופים בשבי. המנוף המרכזי של חמאס — נעלם.');
        lines.push(`שאלת "היום שאחרי": ${this.band(h('gaza_governance_vacuum'), ['מוסדרת יחסית', 'פתוחה חלקית', 'ואקום מתרחב', 'כאוס שלטוני מלא'])}.`);
        break;
      }
      case 'north': {
        lines.push(`חזבאללה: ${this.band(100 - h('hezbollah_strength'), ['בשיא כוחו — עשרות אלפי רקטות', 'נשחק אך מסוכן', 'מוכה פיקודית ולוגיסטית', 'שבור; שיקומו יארך שנים'])}.`);
        lines.push(`הגבול: ${this.band(h('esc_north'), ['שקט מתוח', 'תקריות מתמשכות', 'חילופי אש נרחבים', 'מלחמה פתוחה'])}.`);
        lines.push(`סוריה: ${h('syria_stability') < 30 ? 'סדר שלטוני שביר/מפורק — הזדמנויות וסיכונים' : 'משטר מתפקד'}; ${s.anchorsFired.includes('assad_collapse') ? 'ציר האספקה האיראני ההיסטורי נותק.' : 'ציר אספקה איראני פעיל דרך שטחה.'}`);
        break;
      }
      case 'iran': {
        lines.push(`הגרעין: ${this.band(h('iran_nuclear_progress'), ['התוכנית מושבתת לשנים', 'נפגעה — משתקמת לאט', 'מתקדמת בהסתר', 'על סף יכולת צבאית — או מעבר לו'])} (הערכת מודיעין, לא ודאות).`);
        lines.push(`עימות ישיר: ${this.band(h('esc_iran'), ['מתחת לפני השטח', 'מתיחות גבוהה', 'סבבי אש ישירים', 'מלחמה פתוחה'])}.`);
        lines.push(`אחיזת טהראן בפרוקסים: ${this.band(h('iran_proxy_control'), ['רופפת', 'חלקית', 'הדוקה', 'שליטה ישירה'])}; יציבות המשטר: ${this.band(h('iran_regime_stability'), ['מתערער', 'תחת לחץ', 'יציב', 'איתן'])}.`);
        break;
      }
      case 'usa': {
        lines.push(`הקשר עם וושינגטון: ${this.band(m('us_relations'), ['קרע עמוק', 'מתוח ומותנה', 'איתן עם חיכוכים', 'ברית הדוקה'])}.`);
        lines.push(`מלאים ואספקה: ${this.band(h('military_stocks'), ['קו אדום — קיצוב הכרחי', 'שחיקה מדאיגה', 'סבירים', 'מלאים'])}; נכונות אמריקאית להתערב לצידנו: ${this.band(h('us_intervention_willingness'), ['נמוכה', 'מסויגת', 'גבוהה', 'מלאה'])}.`);
        lines.push(`עצמאות אסטרטגית: ${this.band(m('strategic_autonomy'), ['תלות כמעט מוחלטת', 'תלות גבוהה', 'עצמאות חלקית', 'עצמאות רחבה'])}.`);
        break;
      }
      case 'region': {
        lines.push(`נורמליזציה: ${this.band(m('normalization'), ['קפואה', 'שברירית', 'מתקדמת בשקט', 'פריצת דרך אזורית'])}; הקואליציה העוינת: ${this.band(100 - m('enemy_coalition'), ['רחבה ומתואמת', 'פעילה', 'נחלשת', 'מפוצלת'])}.`);
        lines.push(`ים סוף ותימן: ${this.band(h('esc_yemen'), ['שקט', 'איום מתמשך על השיט', 'שיבוש נתיבים פעיל', 'זירה בוערת'])}.`);
        lines.push(`מצרים וירדן: שיתוף פעולה ביטחוני שקט לצד רגישות ציבורית גבוהה.`);
        break;
      }
      case 'domestic': {
        lines.push(`הקואליציה: ${this.band(m('coalition_stability'), ['על סף נפילה', 'שברירית', 'מתפקדת', 'יציבה'])}; לחץ ציבורי: ${this.band(m('public_pressure'), ['נמוך', 'מורגש', 'גבוה', 'גועש'])}.`);
        lines.push(`כלכלה: ${this.band(m('economy'), ['משבר עמוק', 'תחת לחץ ניכר', 'עמידה', 'איתנה'])}; עומס מילואים: ${this.band(m('reserve_burden'), ['נמוך', 'מורגש', 'כבד', 'קריסה מתקרבת'])}.`);
        lines.push(`לכידות חברתית: ${this.band(m('social_cohesion'), ['קרע עמוק', 'שסעים פעילים', 'מרקם נשמר', 'אחדות נדירה'])}.`);
        if (!s.office.inOffice) lines.push('אינך מכהן — הממשלה בידי יריבך, והשפעתך ציבורית בלבד.');
        break;
      }
      default:
        lines.push('זירה לא מוכרת.');
    }

    // significant events: fired anchors relevant to this theater
    const significant = s.anchorsFired
      .filter((id) => Director.ANCHOR_TOPICS.some((t) => t.re.test(id) && t.topics.includes(topic)))
      .map((id) => this.scenario.canonicalTimeline.find((a) => a.id === id)?.titleHe ?? id)
      .slice(-7);

    // the feedback loop: recent player decisions in this theater + their visible consequences
    const decisions = s.playerMessages
      .filter((pm) => pm.text && this.topicOfMessage(pm) === topic)
      .slice(-5)
      .map((pm) => ({
        textHe: pm.text.slice(0, 120),
        consequencesHe: s.comms.filter((c) => c.inReplyTo === pm.id).map((c) => `${c.senderHe}: ${c.textHe.slice(0, 160)}`),
      }));

    const nameHe = Director.BRIEFING_TOPICS.find((t) => t.id === topic)?.nameHe ?? topic;
    return { topic, nameHe, summaryHe: lines, policyHe: this.policyReviewFor(topic), significantHe: significant, decisionsHe: decisions };
  }
}
