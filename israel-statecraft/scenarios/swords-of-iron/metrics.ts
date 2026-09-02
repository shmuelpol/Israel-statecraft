// Visible metric candidates + hidden variables for the Swords of Iron scenario.
// ~10 visible by default (closed decision #28); qualitative bars, no numbers.

import type { MetricDef } from '../../engine/src/types.js';

export const METRICS: MetricDef[] = [
  { id: 'hostages_metric', nameHe: 'מצב החטופים', descHe: 'שקלול של מספר החטופים המוחזקים, מצבם הידוע וסיכויי השבתם.', icon: 'ribbon', defaultVisible: true, higherIsBetter: true },
  { id: 'deterrence', nameHe: 'הרתעה', descHe: 'עד כמה אויבי ישראל נזהרים מלתקוף אותה בשל מחיר צפוי.', icon: 'shield', defaultVisible: true, higherIsBetter: true },
  { id: 'intl_standing', nameHe: 'מעמד בינלאומי', descHe: 'עומק הקשרים המדיניים והלגיטימציה של פעולות ישראל בעולם.', icon: 'globe', defaultVisible: true, higherIsBetter: true },
  { id: 'antisemitism', nameHe: 'אנטישמיות ודה־לגיטימציה', descHe: 'עוצמת העוינות הגלובלית ליהודים ולעצם קיומה של ישראל.', icon: 'flame', defaultVisible: true, higherIsBetter: false },
  { id: 'us_relations', nameHe: 'יחסים עם ארה״ב', descHe: 'איכות הקשר עם הממשל האמריקאי: אספקה, גיבוי מדיני ותיאום.', icon: 'us', defaultVisible: true, higherIsBetter: true },
  { id: 'iran_nuclear', nameHe: 'האיום הגרעיני האיראני', descHe: 'קרבת איראן ליכולת גרעינית צבאית מבצעית.', icon: 'atom', defaultVisible: true, higherIsBetter: false },
  { id: 'gaza_position', nameHe: 'המערכה בעזה', descHe: 'עמדת ישראל בזירת עזה: שליטה, לחץ על חמאס וחופש פעולה.', icon: 'map', defaultVisible: true, higherIsBetter: true },
  { id: 'north_position', nameHe: 'הזירה הצפונית', descHe: 'עמדת ישראל מול חזבאללה וסוריה: ביטחון היישובים וחופש פעולה.', icon: 'mountain', defaultVisible: true, higherIsBetter: true },
  { id: 'economy', nameHe: 'כלכלה', descHe: 'צמיחה, השקעות, דירוג אשראי ותפקוד שוק העבודה בצל המלחמה.', icon: 'coins', defaultVisible: true, higherIsBetter: true },
  { id: 'social_cohesion', nameHe: 'לכידות חברתית', descHe: 'נכונות הציבור לשאת בנטל יחד, לצד עומק השסעים הפנימיים.', icon: 'people', defaultVisible: true, higherIsBetter: true },
  // available but not default-visible
  { id: 'coalition_stability', nameHe: 'יציבות הקואליציה', descHe: 'חוסן הרוב הפוליטי של הממשלה.', icon: 'bank', defaultVisible: false, higherIsBetter: true },
  { id: 'public_pressure', nameHe: 'לחץ ציבורי', descHe: 'עוצמת הדרישה הציבורית לשינוי מדיניות, לכל כיוון.', icon: 'mega', defaultVisible: false, higherIsBetter: false },
  { id: 'reserve_burden', nameHe: 'עומס המילואים', descHe: 'שחיקת מערך המילואים: ימי שירות, כלכלה ומשפחות.', icon: 'tag', defaultVisible: false, higherIsBetter: false },
  { id: 'state_function', nameHe: 'תפקוד המדינה', descHe: 'יכולת מערכות המדינה לספק שירותים ולתפקד בשגרה ובחירום.', icon: 'gear', defaultVisible: false, higherIsBetter: true },
  { id: 'normalization', nameHe: 'נורמליזציה אזורית', descHe: 'עומק הקשרים עם מדינות ערביות ומוסלמיות.', icon: 'handshake', defaultVisible: false, higherIsBetter: true },
  { id: 'internal_security', nameHe: 'ביטחון פנים', descHe: 'רמת הטרור והפשיעה בתוך ישראל וביהודה ושומרון.', icon: 'lock', defaultVisible: false, higherIsBetter: true },
  { id: 'resilience', nameHe: 'חוסן לאומי', descHe: 'יכולת החברה לעמוד באבדות ובמשברים לאורך זמן.', icon: 'anchor', defaultVisible: false, higherIsBetter: true },
  { id: 'human_capital', nameHe: 'הון אנושי וטכנולוגיה', descHe: 'חינוך, מדע, הייטק ויכולת המשק למשוך ולשמר מצוינות.', icon: 'bulb', defaultVisible: false, higherIsBetter: true },
  { id: 'strategic_autonomy', nameHe: 'עצמאות אסטרטגית', descHe: 'יכולת ישראל לפעול ולהתחמש גם ללא תלות בספקים זרים.', icon: 'rocket', defaultVisible: false, higherIsBetter: true },
  { id: 'enemy_coalition', nameHe: 'הקואליציה נגד ישראל', descHe: 'מספרם וחוזקם של הגורמים הפועלים נגד ישראל בפועל.', icon: 'web', defaultVisible: false, higherIsBetter: false },
];

export const DEFAULT_VISIBLE = [
  'hostages_metric', 'deterrence', 'intl_standing', 'antisemitism', 'us_relations',
  'iran_nuclear', 'gaza_position', 'north_position', 'economy', 'social_cohesion',
];

/** Initial values. `init_metric_*` seeds visible metrics; the rest are hidden variables. */
export const HIDDEN_VARS: Record<string, number> = {
  // metric initializers (state on 2023-09-29)
  init_metric_hostages_metric: 88,   // two captives + two bodies held pre-war
  init_metric_deterrence: 62,
  init_metric_intl_standing: 62,
  init_metric_antisemitism: 30,
  init_metric_us_relations: 60,      // judicial-reform era friction
  init_metric_iran_nuclear: 55,
  init_metric_gaza_position: 55,
  init_metric_north_position: 55,
  init_metric_economy: 68,
  init_metric_social_cohesion: 34,   // judicial-reform rupture
  init_metric_coalition_stability: 62,
  init_metric_public_pressure: 55,
  init_metric_reserve_burden: 18,
  init_metric_state_function: 62,
  init_metric_normalization: 55,     // Abraham Accords + Saudi track
  init_metric_internal_security: 60,
  init_metric_resilience: 60,
  init_metric_human_capital: 74,
  init_metric_strategic_autonomy: 40,
  init_metric_enemy_coalition: 55,

  // hidden strategic variables (0..100)
  enemy_confidence: 55,        // belief that Israel can be destroyed/displaced
  hamas_attack_readiness: 82,  // opening attractor driver
  multi_front_readiness: 35,   // coordinated regional attack potential
  hostage_leverage: 5,
  territorial_leverage: 20,
  institutional_preparation: 40,
  military_stocks: 70,
  intel_quality: 55,
  us_intervention_willingness: 55,
  proxy_coordination: 45,
  iran_proxy_control: 60,
  human_capital_trajectory: 70,
  hezbollah_strength: 85,
  hamas_strength: 80,
  syria_stability: 45,
  iran_nuclear_progress: 60,
  iran_regime_stability: 62,
  esc_gaza: 10,
  esc_north: 10,
  esc_iran: 5,
  esc_yemen: 5,
  esc_wb: 20,
  governance_capacity: 60,
  long_term_risk: 40,
  israel_readiness: 45,        // military alert posture
  gaza_governance_vacuum: 0,
  observer_influence: 0,
};
