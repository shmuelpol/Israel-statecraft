// Swords of Iron scenario package (2023-09-29 → 2026-12-31).
// The engine is generic; everything scenario-specific lives here.

import type { ScenarioPackage, ScoringGuidelines, OpeningRules } from '../../engine/src/types.js';
import { METRICS, DEFAULT_VISIBLE, HIDDEN_VARS } from './metrics.js';
import { REGIONS } from './regions.js';
import { ACTORS, PROMPTS_VERSION } from './actors.js';
import { TIMELINE } from './timeline.js';
import { EVENT_TEMPLATES } from './events.js';

const OPENING: OpeningRules = {
  attackAnchorId: 'oct7_attack',
  minDelayDays: 14,      // pre-war lull with general governance activity before the attack window opens
  maxDelayDays: 150,     // sustained max readiness can push the attack months out
  readinessCostPerDay: [
    { metricId: 'economy', delta: -0.25 },
    { metricId: 'reserve_burden', delta: +0.45 },
    { metricId: 'coalition_stability', delta: -0.2 },
    { metricId: 'public_pressure', delta: +0.3 },
  ],
  multiFrontThreshold: 85, // hidden multi_front_readiness above this enables a coordinated regional attack
};

const SCORING: ScoringGuidelines = {
  dimensions: [
    { id: 'state_survival', nameHe: 'קיום המדינה ותפקודה', weight: 0.14, hint: 'state_function, governance, territorial integrity' },
    { id: 'hostage_outcome', nameHe: 'תוצאת החטופים', weight: 0.1, hint: 'returned alive vs deaths in captivity; closure' },
    { id: 'deterrence_enemy', nameHe: 'הרתעה ושבירת ביטחון האויב', weight: 0.12, hint: 'deterrence metric + enemy_confidence hidden var' },
    { id: 'enemy_military', nameHe: 'מצבם הצבאי של האויבים', weight: 0.09, hint: 'hamas/hezbollah strength, organizational survival' },
    { id: 'territory_position', nameHe: 'עמדות טריטוריאליות', weight: 0.07, hint: 'territorial leverage minus governance burden' },
    { id: 'iran_nuclear', nameHe: 'האיום האיראני והגרעין', weight: 0.11, hint: 'nuclear progress, regime posture' },
    { id: 'us_alliance', nameHe: 'הברית עם ארה״ב', weight: 0.07, hint: 'us_relations at end' },
    { id: 'intl_position', nameHe: 'מעמד בינלאומי ולגיטימציה', weight: 0.06, hint: 'intl_standing minus antisemitism' },
    { id: 'economy_score', nameHe: 'כלכלה', weight: 0.08, hint: 'economy metric + irreversible losses' },
    { id: 'cohesion_score', nameHe: 'לכידות וחוסן', weight: 0.08, hint: 'social_cohesion, resilience' },
    { id: 'human_capital_score', nameHe: 'הון אנושי ועתיד טכנולוגי', weight: 0.08, hint: 'human_capital + trajectory' },
    { id: 'regional_order', nameHe: 'הסדר האזורי ונורמליזציה', weight: 0.06, hint: 'normalization, enemy_coalition' },
    { id: 'open_wars', nameHe: 'מלחמות פתוחות וסיכוני עתיד', weight: 0.04, hint: 'active escalations, reserve state, long_term_risk' },
  ],
  catastropheCaps: [
    { condition: 'state_destroyed', cap: 3 },
    { condition: 'nuclear_attack_on_israel', cap: 8 },
    { condition: 'territory_lost_at_end', cap: 30 },
    { condition: 'reserve_collapse_in_active_war', cap: 45 },
    { condition: 'hostages_abandoned', cap: 55 },
  ],
  longTermWarnings: [
    'human_capital_trajectory<40', 'strategic_autonomy<25', 'iran_nuclear_progress>70',
    'enemy_confidence>70', 'social_cohesion<25', 'long_term_risk>70',
  ],
  baselineNoteHe: 'ההשוואה נערכת מול מהלך ממשלה היסטורית באותם תנאים — ללא נקיבת שמות: השבת כל החטופים עד ינואר 2026, שבירת חזבאללה וחמאס כצבאות, הסרת האיום הסורי, פגיעה קשה בגרעין האיראני — לצד מחיר כבד: שחיקת מילואים וכלכלה, קרע חברתי, בידוד בינלאומי חלקי, ומלחמה איראנית שטרם הוכרעה.',
};

export const SCENARIO: ScenarioPackage = {
  meta: {
    id: 'swords-of-iron',
    version: '1.0.0',
    titleHe: 'חרבות ברזל: המבחן',
    descriptionHe: 'ערב השבעה באוקטובר. אתה ראש הממשלה. הרשת העוינת סביב ישראל מתכוננת — ואתה יודע שמשהו מתקרב, אבל לא מתי ולא איך. שלוש שנים של הכרעות ילמדו אותך מה מחיר כל בחירה.',
  },
  clock: {
    startDate: '2023-09-29',
    endDate: '2026-12-31',
    tickMs: 250,
    // Playtest-calibrated: 2.5 d/s was unreadable for humans. Full run ≈ 16.5 min.
    daysPerSecond: 1.2,
  },
  metrics: METRICS,
  defaultVisibleMetrics: DEFAULT_VISIBLE,
  hiddenVars: HIDDEN_VARS,
  regions: REGIONS,
  actors: ACTORS,
  eventTemplates: EVENT_TEMPLATES,
  canonicalTimeline: TIMELINE,
  openingRules: OPENING,
  scoring: SCORING,
  initialHostages: { totalTaken: 0, living: 2, deceasedHeld: 2, returnedAlive: 0, returnedBodies: 0, leverage: 0.05 },
  atlasPath: 'atlas/out/atlas.json',
  promptsVersion: PROMPTS_VERSION,
};

export default SCENARIO;
