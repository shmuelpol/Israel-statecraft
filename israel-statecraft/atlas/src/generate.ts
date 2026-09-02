// Offline Atlas generator (HLD §28). Produces time-indexed epistemic snapshots
// along the canonical spine, counterfactual branch families A–L with long
// horizons, and the required extreme-state coverage (seed §7).
//
// Blind-counterfactual discipline is structural: every node is built from a
// FrozenContext that only exposes information dated <= the node's date; branch
// families explicitly declare which historical anchors their divergence
// removes, and critics verify no removed future leaks back in.

import type { AtlasNode, AtlasTrajectory, Prerequisite, RegionStatus } from '../../engine/src/types.js';
import { TIMELINE } from '../../scenarios/swords-of-iron/timeline.js';

export const ATLAS_VERSION = 'atlas@1.0.0';

// ---------------------------------------------------------------- historical profile

/** Piecewise historical trajectory of key signature features (research-grounded). */
export function histSignature(date: string): Record<string, number> {
  const d = Date.parse(date);
  const t = (iso: string) => Date.parse(iso);
  const lerp = (a: number, b: number, x: number) => a + (b - a) * Math.max(0, Math.min(1, x));
  const seg = (from: string, to: string) => (d - t(from)) / (t(to) - t(from));

  let hamas = 80, hezbollah = 85, syria = 45, iranNuc = 60, hostages = 0.02, escGaza = 5, escNorth = 5, escIran = 5, us = 60, norm = 55, terr = 20;
  if (d >= t('2023-10-07')) { hamas = lerp(80, 55, seg('2023-10-07', '2024-06-01')); hostages = lerp(1, 0.55, seg('2023-10-07', '2023-12-01')); escGaza = 80; escNorth = 25; us = 72; norm = 45; terr = lerp(20, 45, seg('2023-10-27', '2024-06-01')); }
  if (d >= t('2024-04-13')) { escIran = 35; us = 66; }
  if (d >= t('2024-06-01')) { hamas = lerp(55, 40, seg('2024-06-01', '2025-01-19')); hostages = 0.4; escGaza = 65; }
  if (d >= t('2024-09-17')) { hezbollah = lerp(85, 35, seg('2024-09-17', '2024-11-27')); escNorth = 70; }
  if (d >= t('2024-11-27')) { escNorth = 20; }
  if (d >= t('2024-12-08')) { syria = 15; terr = 55; }
  if (d >= t('2025-01-19')) { escGaza = 15; hostages = 0.24; }
  if (d >= t('2025-03-18')) { escGaza = 70; hamas = lerp(40, 25, seg('2025-03-18', '2025-10-10')); }
  if (d >= t('2025-06-13')) { escIran = 80; iranNuc = 35; us = 78; }
  if (d >= t('2025-06-24')) { escIran = 25; }
  if (d >= t('2025-10-10')) { escGaza = 12; hostages = 0.1; terr = 60; norm = 58; }
  if (d >= t('2026-01-26')) { hostages = 0; }
  if (d >= t('2026-02-28')) { escIran = 85; iranNuc = 25; us = 75; norm = 50; }
  if (d >= t('2026-04-08')) { escIran = 40; escNorth = 30; }
  if (d >= t('2026-07-08')) { escIran = 55; }
  const start = t('2023-09-29');
  return {
    day: (d - start) / 86_400_000 / 1200,
    hamas_strength: hamas / 100, hezbollah_strength: hezbollah / 100, syria_stability: syria / 100,
    iran_nuclear: iranNuc / 100, hostages_held: hostages, esc_gaza: escGaza / 100, esc_north: escNorth / 100,
    esc_iran: escIran / 100, us_relations: us / 100, normalization: norm / 100,
    territorial_leverage: terr / 100, in_office: 1, divergence: 0.05,
  };
}

// ---------------------------------------------------------------- frozen context

export interface FrozenContext {
  date: string;
  firedAnchors: string[];   // canonical anchors dated <= date (knowable history)
  pendingAnchors: string[]; // future anchors — NEVER readable by builders (kept for critics)
}

export function freeze(date: string): FrozenContext {
  const d = Date.parse(date);
  return {
    date,
    firedAnchors: TIMELINE.filter((a) => Date.parse(a.date) <= d).map((a) => a.id),
    pendingAnchors: TIMELINE.filter((a) => Date.parse(a.date) > d).map((a) => a.id),
  };
}

// ---------------------------------------------------------------- era knowledge (time-indexed)

interface EraKnowledge {
  from: string;
  groundTruth: string[];
  beliefs: Record<string, string[]>;
  knownUnknowns: Record<string, string[]>;
  openOptions: string[];
  latentOptions: string[];
  closedOptions: string[];
  whoBenefitsFromTime: string[];
  expected: string[];
}

const ERAS: EraKnowledge[] = [
  {
    from: '2023-09-29',
    groundTruth: [
      'Hamas holds an operational plan for a mass cross-border assault; Israeli intelligence holds fragments without a trusted date',
      'Hezbollah at peak strength (~85) with strong Lebanese constraints', 'Assad regime stands, propped by Russia/Iran/Hezbollah',
      'Iran enriches at 60% with an intact proxy shield', 'Israeli society deeply split over judicial reform',
    ],
    beliefs: {
      israel: ['חמאס מורתע ומוכל; התרעה מדויקת תגיע בזמן', 'האיום המרכזי הוא איראן וחזבאללה'],
      hamas: ['إسرائيل ممزقة داخلياً وقابلة للاختراق', 'عملية كبرى ستشعل الساحات وتفرض قضية الأسرى'],
      hezbollah: ['إسرائيل مرتبكة لكن حرباً شاملة تهدد بقاء التنظيم'],
      iran: ['شبکه نیابتی فشار می‌آورد بی‌آنکه ایران بهای مستقیم بپردازد'],
      usa: ['Regional integration (Saudi track) is the strategic prize; Gaza is a managed problem'],
    },
    knownUnknowns: {
      israel: ['מועד ותצורת המתקפה', 'האם חזבאללה יצטרף למערכה כוללת'],
      hamas: ['هل سينضم حزب الله بكامل قوته', 'كم ستصمد إسرائيل قبل استعادة التوازن'],
    },
    openOptions: ['raise_readiness', 'preemptive_gaza', 'saudi_normalization_track'],
    latentOptions: ['pager_capability', 'deep_iran_campaign'],
    closedOptions: [],
    whoBenefitsFromTime: ['hamas', 'iran', 'hezbollah'],
    expected: ['continued managed friction', 'possible escalation window around holidays'],
  },
  {
    from: '2023-10-07',
    groundTruth: [
      '~1,195 killed, 251 abducted; Israel mobilizes ~300k reserves', 'Hezbollah opens limited solidarity fire',
      'US surges carriers and munitions', 'international sympathy strong but time-limited',
    ],
    beliefs: {
      israel: ['ההפתעה מוחלטת; היקף החדירה מתברר בהדרגה', 'ייתכן שחזבאללה יצטרף — הצפון מפונה'],
      hamas: ['النصر التاريخي تحقق: إسرائيل اخترقت والأسرى في أيدينا', 'الجبهات ستشتعل تباعاً'],
      hezbollah: ['المشاركة المحدودة تحفظ المكانة دون حرب وجودية'],
      iran: ['غافلگیری فرصت است، اما جنگ مستقیم هنوز ممنوع'],
      usa: ['Israel must win but the war must not become regional'],
    },
    knownUnknowns: {
      israel: ['מספר החטופים ומצבם', 'עומק החדירה המודיעינית של האויב', 'האם תיפתח חזית צפונית מלאה'],
      hamas: ['متى وكيف سيرد الاحتلال', 'هل ستصمد شبكة القيادة تحت القصف'],
    },
    openOptions: ['ground_op', 'hostage_negotiation', 'north_preempt'],
    latentOptions: ['pager_capability', 'rafah_control', 'deep_iran_campaign'],
    closedOptions: ['quiet_containment'],
    whoBenefitsFromTime: ['hamas'],
    expected: ['ground operation decision', 'hostage bargaining opens', 'northern attrition'],
  },
  {
    from: '2023-11-22',
    groundTruth: ['first deal: 105 released for pause+prisoners', 'precedent set: Israel pays for hostages', 'Khan Younis phase follows'],
    beliefs: {
      israel: ['עסקאות אפשריות תחת לחץ צבאי; המחיר יעלה עם הזמן'],
      hamas: ['الصفقة أثبتت أن الأسرى يشترون وقفاً للنار ووقتاً للتعافي'],
      usa: ['deals demonstrate a path; pressure Israel toward more'],
    },
    knownUnknowns: { israel: ['כמה חטופים חיים נותרו', 'האם ניתן לשחזר עסקה בלי לסיים את המלחמה'] },
    openOptions: ['extend_deal', 'resume_war', 'rafah_control'],
    latentOptions: ['pager_capability', 'deep_iran_campaign'],
    closedOptions: ['north_preempt_surprise'],
    whoBenefitsFromTime: ['hamas', 'hezbollah'],
    expected: ['fighting resumes', 'attrition in the north continues'],
  },
  {
    from: '2024-04-13',
    groundTruth: ['Iran crossed the direct-attack threshold (~300 projectiles, ~99% intercepted)', 'US-led defensive coalition proven', 'deep-campaign feasibility still UNPROVEN'],
    beliefs: {
      israel: ['איראן מוכנה לתקוף ישירות; ההגנה עמדה הפעם', 'מערכה עמוקה באיראן — עדיין הימור'],
      iran: ['پاسخ مستقیم حیثیت را حفظ کرد بی‌آنکه جنگ فراگیر شود', 'اسرائیل از حمله عمقی می‌ترسد'],
      usa: ['escalation managed; "take the win" doctrine'],
    },
    knownUnknowns: { israel: ['האם מערכה עמוקה ישימה ובאיזה מחיר', 'עמידות ההגנה בסבבים חוזרים'], iran: ['عمق نفوذ اطلاعاتی اسرائیل'] },
    openOptions: ['measured_retaliation', 'rafah_control', 'covert_prep_iran'],
    latentOptions: ['pager_capability', 'deep_iran_campaign'],
    closedOptions: [],
    whoBenefitsFromTime: ['iran'],
    expected: ['Rafah decision', 'hostage track stalls', 'northern attrition deepens'],
  },
  {
    from: '2024-09-17',
    groundTruth: ['communications devices operation shattered Hezbollah C2 in one day', 'Hezbollah revealed as deeply penetrated', 'a decapitation window against the top leadership is open but unexploited'],
    beliefs: {
      israel: ['חזבאללה חדיר הרבה מעבר להערכות; חלון הזדמנויות היסטורי'],
      hezbollah: ['الاختراق كارثي؛ البقاء الآن فوق كل اعتبار'],
      iran: ['محور در خطر فروپاشی است؛ باید مستقیم وارد شد اما نه تا نابودی نظام'],
    },
    knownUnknowns: { israel: ['האם אפשר לתרגם את ההלם להסדר יציב', 'תגובת איראן הבאה'], iran: ['آیا اسرائیل به عمق ایران خواهد زد'] },
    openOptions: ['lebanon_ground', 'lebanon_ceasefire', 'strike_iran_defenses'],
    latentOptions: ['deep_iran_campaign', 'syria_opportunity'],
    closedOptions: ['hezbollah_full_strength_war'],
    whoBenefitsFromTime: ['israel'],
    expected: ['ceasefire push', 'Assad under pressure as Hezbollah prop weakens'],
  },
  {
    from: '2024-09-28',
    groundTruth: ['Nasrallah killed in Dahiyeh strike (Sep 27); command vacuum', 'Iran launches ~180 BM (Oct 1)', 'Israel strikes Iranian air defenses (Oct 26)', 'ground operation clears border villages'],
    beliefs: {
      israel: ['חלון היסטורי: הארגון מעורער פיקודית — יש לתרגם הלם להסדר או להכרעה'],
      hezbollah: ['القيادة ذهبت؛ البقاء التنظيمي فوق كل اعتبار الآن'],
      iran: ['الردع يتطلب رداً مباشراً — لكن بقاء النظام يمنع حرباً شاملة'],
    },
    knownUnknowns: { israel: ['האם אפשר לתרגם את ההלם להסדר יציב', 'תגובת איראן הבאה'], iran: ['آیا اسرائیل به عمق ایران خواهد زد'] },
    openOptions: ['lebanon_ground', 'lebanon_ceasefire', 'strike_iran_defenses'],
    latentOptions: ['deep_iran_campaign', 'syria_opportunity'],
    closedOptions: ['hezbollah_full_strength_war'],
    whoBenefitsFromTime: ['israel'],
    expected: ['ceasefire push', 'Assad under pressure as Hezbollah prop weakens'],
  },
  {
    from: '2024-12-08',
    groundTruth: ['Assad fell; al-Sharaa leads successor order', 'Israel destroyed strategic stocks + holds Hermon buffer', 'Iranian corridor severed', 'deep-campaign feasibility STILL unproven, conditions improved'],
    beliefs: {
      israel: ['נפתח חלון לאיראן — אך הוכחה עדיין אין', 'הממשל הסורי החדש — עלום: עוין? פרגמטי?'],
      iran: ['کریدور از دست رفت؛ باید برنامه هسته‌ای شتاب گیرد'],
      usa: ['new administration incoming; maximum-pressure posture returns'],
    },
    knownUnknowns: { israel: ['כוונות הממשל הסורי החדש', 'האם ארה״ב תצטרף למהלך באיראן'], iran: ['آیا آمریکا مستقیماً وارد می‌شود'] },
    openOptions: ['syria_engagement', 'deep_iran_campaign_prep', 'phased_hostage_deal'],
    latentOptions: ['us_joint_strike'],
    closedOptions: ['iran_corridor_dependent_strategies'],
    whoBenefitsFromTime: ['israel', 'usa'],
    expected: ['phased hostage deal', 'Iran talks vs strike decision'],
  },
  {
    from: '2025-06-13',
    groundTruth: ['12-day war: Israel sustained a deep campaign; US struck Fordow/Natanz/Isfahan', 'proxies did NOT activate at full strength', '~400kg 60% HEU unaccounted; knowledge intact'],
    beliefs: {
      israel: ['היתכנות המערכה העמוקה הוכחה — אך הגרעין לא הוכרע'],
      iran: ['نظام زنده ماند؛ بازسازی در اختفا آغاز می‌شود', 'بدون بازدارندگی هسته‌ای، حمله بعدی حتمی است'],
      usa: ['obliteration achieved (public); intel more cautious (private)'],
    },
    knownUnknowns: { israel: ['מיקום החומר המועשר', 'קצב השיקום האיראני'], usa: ['whether Iran races covertly to a device'] },
    openOptions: ['gaza_endgame_framework', 'iran_follow_up', 'saudi_track_revival'],
    latentOptions: ['regime_collapse_exploitation'],
    closedOptions: ['iran_deniability_doctrine'],
    whoBenefitsFromTime: ['iran (rebuild) and israel (consolidate) simultaneously — race condition'],
    expected: ['Gaza framework push', 'hostage endgame', 'Iranian covert reconstitution'],
  },
  {
    from: '2025-10-10',
    groundTruth: ['20-point framework: all living hostages out (Oct 13), yellow line (~53% control)', 'Hamas keeps arms in its zones; disarmament unresolved', 'UNSC 2803 endorses Board of Peace'],
    beliefs: {
      israel: ['המנוף המרכזי של חמאס נעלם; חופש הפעולה גדל — והעולם מצפה לריסון'],
      hamas: ['البقاء تحقق: سلمنا الأسرى واحتفظنا بالسلاح والحكم في مناطقنا'],
      usa: ['the deal must hold; Board of Peace is the president\'s legacy project'],
    },
    knownUnknowns: { israel: ['האם הפירוז ייאכף אי־פעם', 'האם איראן משתקמת מהר מההערכות'] },
    openOptions: ['enforce_disarmament', 'complete_withdrawal', 'resume_campaign_post_hostages'],
    latentOptions: ['joint_us_iran_campaign'],
    closedOptions: ['hostage_leverage_strategies'],
    whoBenefitsFromTime: ['hamas (reconstitution)', 'iran (nuclear rebuild)'],
    expected: ['governance struggle in Gaza', 'Iran reconstitution crisis', 'Israeli election pressure'],
  },
  {
    from: '2026-02-28',
    groundTruth: ['joint US-Israel campaign killed Khamenei; Mojtaba succeeds (hardline)', 'Hormuz closed; global energy shock', 'Hezbollah reactivated; a 40-day war grinds toward a conditional pause'],
    beliefs: {
      israel: ['המשטר האיראני מעולם לא היה פגיע יותר — וגם מעולם לא מיואש יותר'],
      iran: ['بقای نظام یعنی ایستادگی؛ تسلیم یعنی فروپاشی'],
      usa: ['post-war architecture must reopen Hormuz; patience finite'],
      saudi: ['إيران المضروبة فرصة — لكن الفوضى النووية خطر على الجميع'],
    },
    knownUnknowns: { israel: ['יציבות משטר מג׳תבא', 'מיקום החומר הגרעיני'], usa: ['whether blockade or diplomacy reopens Hormuz'] },
    openOptions: ['pressure_track', 'settlement_track', 'lebanon_disarmament_track', 'gaza_orange_line'],
    latentOptions: ['iran_regime_change_support'],
    closedOptions: [],
    whoBenefitsFromTime: ['unclear — contested equilibrium'],
    expected: ['Hormuz standoff', 'Gaza disarmament fight', 'election pressure building'],
  },
  {
    from: '2026-07-08',
    groundTruth: ['the June 17 US–Iran memorandum collapsed on July 8 after Iranian strikes on shipping', 'Hormuz re-closed; US strikes resumed', 'Knesset dissolved (Jul 17); election set for Oct 27'],
    beliefs: {
      israel: ['ההסדר קרס כצפוי; שאלת איראן תוכרע בכוח או בהתשה'],
      iran: ['فشار حداکثری شکست؛ مقاومت تنها راه بقاست'],
      usa: ['blockade until compliance; no more memoranda without verification'],
    },
    knownUnknowns: { israel: ['יציבות משטר מג׳תבא', 'תוצאות הבחירות'], usa: ['whether blockade or diplomacy reopens Hormuz'] },
    openOptions: ['pressure_track', 'settlement_track', 'lebanon_disarmament_track', 'gaza_orange_line'],
    latentOptions: ['iran_regime_change_support'],
    closedOptions: ['islamabad_framework'],
    whoBenefitsFromTime: ['unclear — contested equilibrium'],
    expected: ['Oct 27 election', 'Hormuz standoff', 'SIMULATED FUTURE beyond 2026-08-14'],
  },
];

function eraFor(date: string): EraKnowledge {
  const d = Date.parse(date);
  let best = ERAS[0];
  for (const e of ERAS) if (Date.parse(e.from) <= d) best = e;
  return best;
}

// ---------------------------------------------------------------- node assembly

const GOALS: Record<string, string[]> = {
  israel: ['survival', 'security', 'hostages', 'economy', 'alliances'],
  hamas: ['destroy_israel', 'org_survival', 'hostage_leverage', 'territory', 'victory_image'],
  hezbollah: ['org_survival', 'destroy_israel', 'arsenal_and_lebanon_control', 'obey_iran', 'lebanon_function', 'prestige'],
  iran: ['regime_survival', 'destroy_israel', 'proxy_network', 'nuclear', 'regional_dominance', 'avoid_direct_war', 'economy'],
  usa: ['us_influence', 'prevent_regional_war', 'contain_iran', 'protect_forces', 'israel_survival', 'domestic_politics'],
};

const FEARS: Record<string, string[]> = {
  israel: ['multi-front surprise', 'hostage deaths', 'US abandonment', 'nuclear Iran', 'internal collapse'],
  hamas: ['organizational annihilation counted as Israeli victory', 'loss of Gaza rule without narrative'],
  hezbollah: ['organizational destruction', 'losing Lebanon host environment'],
  iran: ['regime collapse', 'direct war with the US', 'loss of proxy shield'],
  usa: ['uncontrolled regional war', 'oil shock', 'US casualties'],
};

const HORIZONS: Record<string, number> = { israel: 30, hamas: 40, hezbollah: 25, iran: 30, usa: 4 };
const WTP: Record<string, number> = { israel: 0.7, hamas: 0.95, hezbollah: 0.7, iran: 0.6, usa: 0.4 };

function mapStateFor(sig: Record<string, number>): Record<string, { controller: string; status: RegionStatus }> {
  return {
    gaza: { controller: sig.hamas_strength > 0.6 ? 'hamas' : 'israel', status: sig.esc_gaza > 0.4 ? 'contested' : sig.territorial_leverage > 0.5 ? 'buffer' : 'normal' },
    lebanon: { controller: 'lebanon_state', status: sig.esc_north > 0.4 ? 'contested' : 'normal' },
    syria: { controller: 'syria_regime', status: sig.syria_stability < 0.3 ? 'fragmented' : 'normal' },
    iran: { controller: 'iran', status: sig.esc_iran > 0.5 ? 'contested' : 'normal' },
    israel: { controller: 'israel', status: 'normal' },
  };
}

interface NodeSpec {
  id: string;
  date: string;
  era: string;
  branchFamily?: string;
  sigOverride?: Record<string, number>;
  extraTruth?: string[];
  trajectories?: AtlasTrajectory[];
  prerequisites?: Prerequisite[];
  removedAnchors?: string[]; // anchors this branch's divergence removes (critic input)
  confidence?: number;
  attitudes?: Record<string, number>;
}

export function buildNode(spec: NodeSpec): AtlasNode & { removedAnchors?: string[] } {
  const frozen = freeze(spec.date);
  const era = eraFor(spec.date);
  const sig = { ...histSignature(spec.date), ...(spec.sigOverride ?? {}) };
  return {
    id: spec.id,
    date: spec.date,
    era: spec.era,
    branchFamily: spec.branchFamily,
    signature: sig,
    groundTruth: [...era.groundTruth, ...(spec.extraTruth ?? [])],
    actorBeliefs: era.beliefs,
    knownUnknowns: era.knownUnknowns,
    unknownUnknowns: { israel: ['depth of enemy intelligence on Israeli plans'], iran: ['عمق نفوذ اسرائیل در سامانه‌های ما'] },
    capabilities: {
      israel: { military: 88, intel: 82 },
      hamas: { military: Math.round(sig.hamas_strength * 100) },
      hezbollah: { missiles: Math.round(sig.hezbollah_strength * 100) },
      iran: { missiles: 80, nuclear: Math.round(sig.iran_nuclear * 100) },
    },
    perceivedCapabilities: { hamas: { israel_resolve: Math.round((1 - sig.hostages_held) * 60 + 20) } },
    goals: GOALS,
    fears: FEARS,
    timeHorizons: HORIZONS,
    willingnessToPay: WTP,
    commitments: frozen.firedAnchors.filter((a) => ['hostage_deal_1', 'lebanon_ceasefire', 'gaza_framework_oct25'].includes(a)).map((a) => `commitment:${a}`),
    domesticConstraints: {
      israel: sig.day < 0.05 ? ['judicial-reform rupture', 'reserve protest movements'] : ['hostage families pressure', 'coalition arithmetic', 'reserve burden'],
      iran: ['economic strain', 'legitimacy deficit'],
      usa: ['election cycle', 'oil prices', 'congressional politics'],
    },
    internationalAttitudes: spec.attitudes ?? { usa: Math.round(sig.us_relations * 100 - 30), saudi: 15, egypt: 20, turkey: -25, russia: -5, china: 0 },
    whoBenefitsFromTime: era.whoBenefitsFromTime,
    openOptions: era.openOptions,
    latentOptions: era.latentOptions,
    closedOptions: era.closedOptions,
    expectedDevelopments: era.expected,
    trajectories: spec.trajectories ?? [],
    exogenous: ['US election cycle', 'Russian capacity absorbed by Ukraine', 'global energy markets', 'Syrian internal opposition dynamics'],
    endogenous: ['enemy confidence', 'hostage leverage', 'territorial control', 'alliance depth', 'escalation levels'],
    mapState: mapStateFor(sig),
    prerequisites: spec.prerequisites ?? [],
    sources: [{ id: 'S01', confidence: 0.7 }, { id: 'research:verified_timeline', confidence: 0.85 }],
    confidence: spec.confidence ?? 0.8,
    removedAnchors: spec.removedAnchors,
  };
}

// ---------------------------------------------------------------- generation

export function generateAtlas(): (AtlasNode & { removedAnchors?: string[] })[] {
  const nodes: (AtlasNode & { removedAnchors?: string[] })[] = [];

  // 1) Canonical spine: one epistemic snapshot per anchor + interstitial months.
  for (const a of TIMELINE) {
    nodes.push(buildNode({
      id: `spine_${a.id}`, date: a.date, era: 'canonical',
      extraTruth: [`anchor:${a.id} occurs around this date in the reference trajectory`],
      prerequisites: a.prerequisites,
      trajectories: [{
        id: `traj_${a.id}`, description: `reference continuation after ${a.title}`,
        steps: [{ afterDays: 15, development: 'reference trajectory continues per canonical timeline' }],
        longHorizon: 'converges to the August 2026 reference state if no divergence intervenes',
      }],
      confidence: 0.85,
    }));
  }
  const months = ['2023-11-15', '2024-01-15', '2024-02-15', '2024-03-15', '2024-07-15', '2024-08-15', '2024-11-10', '2025-02-15', '2025-04-15', '2025-05-15', '2025-08-15', '2025-09-15', '2025-12-15', '2026-05-15'];
  for (const m of months) {
    nodes.push(buildNode({ id: `spine_month_${m}`, date: m, era: 'canonical', confidence: 0.75 }));
  }

  // 2) Counterfactual branch families A..L (multi-node, long-horizon, blind).
  const fam = (
    family: string, baseDate: string, steps: { id: string; date: string; sig: Record<string, number>; truth: string[]; removed: string[]; prereq?: Prerequisite[] }[],
    trajectory: AtlasTrajectory,
  ) => {
    for (const s of steps) {
      nodes.push(buildNode({
        id: `branch_${family}_${s.id}`, date: s.date, era: `family_${family}`, branchFamily: family,
        sigOverride: { ...s.sig, divergence: 0.6 }, extraTruth: s.truth, removedAnchors: s.removed,
        prerequisites: s.prereq ?? [], trajectories: [trajectory], confidence: 0.6,
      }));
    }
  };

  fam('A', '2023-10-07', [
    { id: 'alert1', date: '2023-11-05', sig: { hostages_held: 0.02, esc_gaza: 0.15 }, truth: ['Israel holds maximum readiness; Hamas postpones; economy and coalition bleed'], removed: ['oct7_attack'] },
    { id: 'alert2', date: '2024-01-20', sig: { hostages_held: 0.02, esc_gaza: 0.2, us_relations: 0.5 }, truth: ['prolonged alert: reserve exhaustion, deception operations rise, multi-front readiness climbs'], removed: ['oct7_attack', 'hostage_deal_1'] },
    { id: 'alert3', date: '2024-03-15', sig: { hostages_held: 0.05, esc_gaza: 0.3, esc_north: 0.3 }, truth: ['readiness lapses under political pressure; a later, better-coordinated attack window opens'], removed: ['hostage_deal_1', 'damascus_consulate'] },
  ], {
    id: 'traj_A', description: 'foreknowledge trap: alert → exhaustion → deferred attack under worse conditions',
    steps: [{ afterDays: 30, development: 'coordinated multi-front assault attempt if enemy readiness crossed threshold' }, { afterDays: 90, development: 'existential defense or preemption dilemma' }],
    longHorizon: 'either a worse coordinated war or a politically ruinous permanent mobilization; no quiet return to Oct 6 normal',
  });

  fam('B', '2023-11-22', [
    { id: 'deal_all', date: '2023-12-10', sig: { hostages_held: 0.05, esc_gaza: 0.1, hamas_strength: 0.75 }, truth: ['war-ending deal returns most hostages; Hamas survives ruling Gaza with victory narrative'], removed: ['fighting_resumes_dec23', 'rafah_op', 'sinwar_killed'] },
    { id: 'rebuild', date: '2024-06-15', sig: { hostages_held: 0.02, hamas_strength: 0.85, esc_gaza: 0.05 }, truth: ['Hamas rebuilds openly; enemy confidence surges; recruitment across theaters rises'], removed: ['rafah_op', 'sinwar_killed', 'gaza_war_resumes'] },
    { id: 'next_round', date: '2025-06-15', sig: { hamas_strength: 0.9, esc_gaza: 0.15, hezbollah_strength: 0.85 }, truth: ['fortified Hamas plans the next October 7; Hezbollah never weakened; Assad still stands'], removed: ['pager_operation', 'nasrallah_killed', 'assad_collapse', 'iran_war_june25'] },
  ], {
    id: 'traj_B', description: 'hostages-first: humanitarian win, strategic deferral',
    steps: [{ afterDays: 60, development: 'domestic relief then accountability wave' }, { afterDays: 300, development: 'rearmed axis; deterrence at historic low' }],
    longHorizon: 'by 2026: intact enemy network with proven hostage doctrine; Israel faces the same war later, stronger enemy — OR a favorable regional deal freezes recovery (low probability path)',
  });

  fam('C', '2024-06-01', [
    { id: 'hold', date: '2024-08-15', sig: { territorial_leverage: 0.7, esc_gaza: 0.5 }, truth: ['Israel holds and administers all of Gaza; insurgency simmers; governance burden mounts'], removed: ['hostage_deal_2', 'gaza_framework_oct25'] },
    { id: 'order', date: '2025-05-15', sig: { territorial_leverage: 0.8, hamas_strength: 0.15, esc_gaza: 0.3 }, truth: ['military government functions; costs high; local administration seedlings under Israeli security'], removed: ['gaza_framework_oct25'] },
  ], {
    id: 'traj_C', description: 'territorial victory with governance burden',
    steps: [{ afterDays: 120, development: 'insurgency cycles vs slow stabilization race' }, { afterDays: 400, development: 'either durable non-Hamas order or grinding occupation' }],
    longHorizon: 'durable success IF converted into a stable order; otherwise long occupation with reserve/economy drain — the vacuum is NOT automatically worse than Hamas',
  });

  fam('D', '2024-03-01', [
    { id: 'raid1', date: '2024-05-15', sig: { territorial_leverage: 0.25, hamas_strength: 0.55, esc_gaza: 0.6 }, truth: ['raid cycle: capture-exit-return; Hamas refills cleared zones within weeks'], removed: ['rafah_op'] },
    { id: 'raid2', date: '2025-03-15', sig: { territorial_leverage: 0.2, hamas_strength: 0.6, esc_gaza: 0.55 }, truth: ['recurring casualties without durable denial; war lengthens; reserves grind'], removed: ['gaza_framework_oct25'] },
  ], {
    id: 'traj_D', description: 'raid cycle equilibrium',
    steps: [{ afterDays: 180, development: 'public exhaustion vs enemy adaptation' }],
    longHorizon: 'long war, modest leverage, high cumulative cost; enemy narrative of survival strengthens',
  });

  fam('E', '2023-10-11', [
    { id: 'north_first', date: '2023-10-11', sig: { esc_north: 0.85, esc_gaza: 0.35, hezbollah_strength: 0.8 }, truth: ['Israel strikes Hezbollah at full strength: heavy home-front damage; Syria intact as Iranian logistics rear'], removed: ['pager_operation', 'nasrallah_killed'] },
    { id: 'north_grind', date: '2024-02-15', sig: { esc_north: 0.7, hezbollah_strength: 0.6, us_relations: 0.45 }, truth: ['grinding two-front war; US restrains; displacement both directions; pager capability unused (burned in mobilization)'], removed: ['pager_operation', 'assad_collapse'] },
  ], {
    id: 'traj_E', description: 'early northern war against full-strength Hezbollah',
    steps: [{ afterDays: 90, development: 'attrition with heavier costs than the historical late campaign' }, { afterDays: 250, development: 'possible earlier — or failed — Hezbollah degradation; Syria dynamics differ' }],
    longHorizon: 'higher immediate cost, uncertain Syrian collapse; may prevent prolonged displacement or produce a longer regional war',
  });

  fam('F', '2024-12-08', [
    { id: 'assad_stands', date: '2024-12-20', sig: { syria_stability: 0.5, hezbollah_strength: 0.55, iran_nuclear: 0.65 }, truth: ['Hezbollah preserved enough force to prop Assad; corridor holds; Syrian air defenses intact'], removed: ['assad_collapse', 'syria_strikes_buffer'], prereq: [{ kind: 'hiddenVarMin', varId: 'hezbollah_strength', min: 56 }] },
    { id: 'corridor', date: '2025-06-15', sig: { syria_stability: 0.55, hezbollah_strength: 0.6, iran_nuclear: 0.7, esc_iran: 0.3 }, truth: ['Iran rearms Hezbollah through intact corridor; deep-campaign risk profile far worse'], removed: ['assad_collapse', 'iran_war_june25'] },
  ], {
    id: 'traj_F', description: 'Assad survives behind a stronger Hezbollah',
    steps: [{ afterDays: 200, development: 'Iranian shield rebuilds; Israeli freedom of action shrinks' }],
    longHorizon: 'no Syrian collapse; Iran approaches threshold behind an intact shield; northern invasion threat persists into 2026',
  });

  fam('G', '2024-04-20', [
    { id: 'early_strike', date: '2024-04-20', sig: { esc_iran: 0.7, iran_nuclear: 0.55, us_relations: 0.4, hezbollah_strength: 0.8 }, truth: ['Israel strikes Iran deep in April 2024: Syrian defenses alive, Hezbollah full, US opposed — outcome genuinely uncertain'], removed: ['iran_war_june25', 'us_fordow_strike'] },
    { id: 'aftermath', date: '2024-07-15', sig: { esc_iran: 0.6, esc_north: 0.6, us_relations: 0.35 }, truth: ['multi-front retaliation; aircraft losses plausible; alliance strained; nuclear program partially hit at best'], removed: ['us_fordow_strike', 'pager_operation'] },
  ], {
    id: 'traj_G', description: 'early Iran strike inside the plausible envelope — both failure and success possible',
    steps: [{ afterDays: 60, development: 'attrition exchange; Hezbollah activation decision' }, { afterDays: 200, development: 'program delayed months not years; or catastrophic escalation' }],
    longHorizon: 'no June-2025-style proven success; either costly partial achievement or regional war without US backing',
  });

  fam('H', '2025-11-15', [
    { id: 'coalition', date: '2025-11-15', sig: { normalization: 0.75, us_relations: 0.85, esc_iran: 0.2 }, truth: ['Saudi normalization signed with defense pact; regional coalition presses Hamas remnants and contains Iran'], removed: [] },
    { id: 'deep_norm', date: '2026-06-15', sig: { normalization: 0.85, esc_gaza: 0.05, iran_nuclear: 0.3 }, truth: ['Arab-financed Gaza reconstruction under coalition supervision; Iranian isolation deepens without war'], removed: ['iran_war_2026', 'hormuz_closure'] },
  ], {
    id: 'traj_H', description: 'regional coalition split: normalization as strategy',
    steps: [{ afterDays: 120, development: 'coalition pressure replaces unilateral force' }],
    longHorizon: 'by end-2026: strongest diplomatic position in state history, constrained by partner interests; Iran contained not defeated',
  });

  fam('I', '2024-05-15', [
    { id: 'rupture', date: '2024-05-15', sig: { us_relations: 0.2, esc_gaza: 0.7 }, truth: ['open US rupture over Rafah: weapons pause hardens into embargo posture'], removed: ['us_fordow_strike'] },
    { id: 'autonomy_race', date: '2025-02-15', sig: { us_relations: 0.25, esc_iran: 0.3 }, truth: ['Israel races to build autonomy: domestic lines, alternative suppliers, rationing; vulnerability window open'], removed: ['us_fordow_strike', 'iran_war_2026'] },
  ], {
    id: 'traj_I', description: 'US rupture: outcomes hinge on prior autonomy investment',
    steps: [{ afterDays: 100, development: 'stock pressure or autonomy dividends' }, { afterDays: 300, development: 'alternative alignments (visible but shallow)' }],
    longHorizon: 'severe short-term vulnerability; possible long-term autonomy gain; no US strike on Fordow in this world',
  });

  fam('J', '2024-07-01', [
    { id: 'fall', date: '2024-07-01', sig: { in_office: 0, divergence: 0.5 }, truth: ['government falls mid-war; successor governs cautiously; ex-PM in observer role'], removed: [] },
    { id: 'observer', date: '2025-01-15', sig: { in_office: 0 }, truth: ['persistent opposition activity accumulates influence slowly; comeback possible only through crisis + momentum'], removed: [] },
  ], {
    id: 'traj_J', description: 'loss of office: observer mode dynamics',
    steps: [{ afterDays: 200, development: 'successor policy drifts institutional-default' }],
    longHorizon: 'final score judges the STATE, not the seat; excellent end-state possible from opposition',
  });

  fam('K', '2025-08-15', [
    { id: 'threshold', date: '2025-08-15', sig: { iran_nuclear: 0.85, esc_iran: 0.3 }, truth: ['Iran races covertly post-June: crosses threshold with hidden HEU; announces latent capability'], removed: ['iran_war_2026'] },
    { id: 'new_rules', date: '2026-03-15', sig: { iran_nuclear: 0.9, esc_iran: 0.25, normalization: 0.4 }, truth: ['nuclear Iran: proxy confidence up, US caution up, Saudi proliferation pressure, preventive window closed'], removed: ['iran_war_2026', 'hormuz_closure'] },
  ], {
    id: 'traj_K', description: 'nuclear threshold crossed — not game over, drastically changed environment',
    steps: [{ afterDays: 100, development: 'deterrence architecture rebuild or acceptance diplomacy' }],
    longHorizon: 'existential risk management era: deterrence, defense, diplomacy, or a far riskier preventive war',
  });

  fam('L', '2023-10-07', [
    { id: 'multi_front', date: '2023-10-07', sig: { esc_gaza: 0.9, esc_north: 0.9, hostages_held: 1, in_office: 1, divergence: 0.7 }, truth: ['coordinated multi-front assault: Hezbollah invades the Galilee as Hamas breaches the south'], removed: [] },
    { id: 'collapse_risk', date: '2023-11-15', sig: { esc_gaza: 0.9, esc_north: 0.95, us_relations: 0.8 }, truth: ['organized defense strained to breaking; US intervention decisive variable; state destruction causally reachable'], removed: [] },
  ], {
    id: 'traj_L', description: 'state-destruction path — used only with credible causal chain',
    steps: [{ afterDays: 30, development: 'defense consolidates with US backing OR territorial losses cascade' }, { afterDays: 90, development: 'recovery war or collapse' }],
    longHorizon: 'either a scarred survival with rebuilt deterrence, or loss of organized defense — the map must be able to render both',
  });

  // 3) Extreme-state coverage (seed §7 — all 22 states representable & retrievable).
  const extremes: { id: string; date: string; sig: Record<string, number>; truth: string; map?: Record<string, { controller: string; status: RegionStatus }> }[] = [
    { id: 'ext_gaza_full_control', date: '2025-06-15', sig: { territorial_leverage: 0.85, hamas_strength: 0.1 }, truth: 'total Israeli control of Gaza' },
    { id: 'ext_gaza_no_control', date: '2025-06-15', sig: { territorial_leverage: 0.05, hamas_strength: 0.8 }, truth: 'no Israeli control of Gaza' },
    { id: 'ext_enemy_in_israel', date: '2023-10-20', sig: { esc_gaza: 0.95, esc_north: 0.9 }, truth: 'enemy temporary control of Israeli territory', map: { israel: { controller: 'israel', status: 'contested' } } },
    { id: 'ext_deep_lebanon', date: '2024-11-15', sig: { esc_north: 0.8, territorial_leverage: 0.7 }, truth: 'Israeli control deep in Lebanon' },
    { id: 'ext_intl_zones', date: '2026-03-15', sig: { territorial_leverage: 0.5 }, truth: 'international governance zones in Gaza', map: { gaza: { controller: 'none', status: 'international' } } },
    { id: 'ext_buffer_zones', date: '2025-01-15', sig: { territorial_leverage: 0.6 }, truth: 'buffer zones on multiple frontiers' },
    { id: 'ext_syria_fragmented', date: '2025-03-15', sig: { syria_stability: 0.1 }, truth: 'Syrian fragmentation into cantons', map: { syria: { controller: 'none', status: 'fragmented' } } },
    { id: 'ext_syria_friendly', date: '2026-05-15', sig: { syria_stability: 0.6 }, truth: 'friendly/pragmatic Syrian successor seeking security accord' },
    { id: 'ext_syria_hostile', date: '2025-09-15', sig: { syria_stability: 0.5, esc_north: 0.5 }, truth: 'hostile ideological Syrian successor opens a new front' },
    { id: 'ext_assad_restored', date: '2025-12-15', sig: { syria_stability: 0.55 }, truth: 'restored Assad-type rule under Russian patronage' },
    { id: 'ext_hezbollah_independent', date: '2025-08-15', sig: { hezbollah_strength: 0.5 }, truth: 'Hezbollah independent of Iran (post-succession drift)' },
    { id: 'ext_hezbollah_irgc', date: '2026-04-15', sig: { hezbollah_strength: 0.45 }, truth: 'direct Iranian (IRGC) command of Hezbollah' },
    { id: 'ext_iran_no_regime', date: '2026-06-15', sig: { esc_iran: 0.6 }, truth: 'Iran without a coherent central regime' },
    { id: 'ext_iran_nuclear', date: '2026-05-15', sig: { iran_nuclear: 0.95 }, truth: 'nuclear-armed Iran' },
    { id: 'ext_iran_denuclearized', date: '2026-07-15', sig: { iran_nuclear: 0.05 }, truth: 'verified Iranian dismantlement' },
    { id: 'ext_us_abandonment', date: '2025-05-15', sig: { us_relations: 0.1 }, truth: 'United States abandonment posture' },
    { id: 'ext_regional_alliance', date: '2026-06-15', sig: { normalization: 0.9 }, truth: 'formal regional defense alliance including Israel' },
    { id: 'ext_civil_unrest', date: '2025-07-15', sig: { in_office: 1 }, truth: 'civil unrest and loss of government authority in parts of Israel' },
    { id: 'ext_econ_collapse', date: '2025-10-15', sig: {}, truth: 'strategic economic collapse (flight of capital and people)' },
    { id: 'ext_tech_decline', date: '2026-08-15', sig: {}, truth: 'long-term technological decline trajectory locked in' },
    { id: 'ext_return_office', date: '2026-02-15', sig: { in_office: 1, divergence: 0.5 }, truth: 'return to office after observer period' },
    { id: 'ext_war_past_horizon', date: '2026-12-15', sig: { esc_iran: 0.7, esc_north: 0.6 }, truth: 'war continuing past the scenario horizon' },
  ];
  for (const e of extremes) {
    const n = buildNode({ id: e.id, date: e.date, era: 'extreme', sigOverride: { ...e.sig, divergence: 0.8 }, extraTruth: [e.truth], confidence: 0.5 });
    if (e.map) n.mapState = { ...n.mapState, ...e.map };
    nodes.push(n);
  }

  return nodes;
}
