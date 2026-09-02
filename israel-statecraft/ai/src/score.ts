// Final scoring: dynamic Director evaluation under authored guidelines.
// Mostly final-snapshot based, with irreversible losses; judges outcomes,
// never decision quality at the time; no morality meter; hidden until the end.

import type { GameState, ScenarioPackage, FinalScoreReport, ScoreDimension } from '../../engine/src/types.js';
import { clamp } from '../../engine/src/util.js';

export function computeFinalScore(state: GameState, scenario: ScenarioPackage): FinalScoreReport {
  const m = (id: string) => state.metrics[id]?.value ?? 50;
  const h = (id: string) => state.hidden[id] ?? 50;
  const hs = state.hostages;

  const dims: ScoreDimension[] = [];
  const push = (id: string, nameHe: string, weight: number, score: number, notesHe: string) =>
    dims.push({ id, nameHe, weight, score: clamp(Math.round(score)), notesHe });

  const guidelines = Object.fromEntries(scenario.scoring.dimensions.map((d) => [d.id, d]));
  const w = (id: string) => guidelines[id]?.weight ?? 0.05;

  // --- dimensions (final snapshot + irreversible history)
  const stateDestroyed = state.regions.israel?.status === 'collapsed' || m('state_function') < 8;
  push('state_survival', 'קיום המדינה ותפקודה', w('state_survival'),
    stateDestroyed ? 0 : (m('state_function') * 0.7 + h('governance_capacity') * 0.3),
    stateDestroyed ? 'המדינה איבדה את היכולת לקיים הגנה מאורגנת.' : 'המדינה מתפקדת; מוסדותיה עומדים.');

  const hostageDeaths = state.losses.filter((l) => l.kind === 'hostage_deaths').reduce((s, l) => s + l.magnitude, 0);
  const stillHeld = hs.living + hs.deceasedHeld;
  push('hostage_outcome', 'תוצאת החטופים', w('hostage_outcome'),
    100 - stillHeld * 1.2 - hostageDeaths * 30 - (hs.totalTaken > 0 ? (hs.totalTaken - hs.returnedAlive - hs.returnedBodies) * 0.2 : 0),
    stillHeld > 0 ? `בסוף הריצה נותרו ${stillHeld} חטופים בשבי — פצע פתוח.` : hs.totalTaken > 0 ? 'כל החטופים הושבו — חיים או לקבורה.' : 'לא נלקחו חטופים בהיקף אסון.');

  push('deterrence_enemy', 'הרתעה ושבירת ביטחון האויב', w('deterrence_enemy'),
    m('deterrence') * 0.6 + (100 - h('enemy_confidence')) * 0.4,
    h('enemy_confidence') > 60 ? 'אויבי ישראל עדיין מאמינים שחורבנה אפשרי ומתקרב.' : 'האמונה ביכולת להשמיד את ישראל נחלשה מהותית.');

  push('enemy_military', 'מצבם הצבאי של האויבים', w('enemy_military'),
    100 - (h('hamas_strength') * 0.45 + h('hezbollah_strength') * 0.55),
    `חמאס: ${h('hamas_strength') < 30 ? 'שבור' : h('hamas_strength') < 60 ? 'שחוק' : 'עומד'}; חזבאללה: ${h('hezbollah_strength') < 30 ? 'שבור' : h('hezbollah_strength') < 60 ? 'שחוק' : 'עומד'}.`);

  push('territory_position', 'עמדות טריטוריאליות', w('territory_position'),
    h('territorial_leverage') * 0.8 + (100 - h('gaza_governance_vacuum')) * 0.2,
    h('territorial_leverage') > 50 ? 'ישראל מחזיקה עומק ונכסים טריטוריאליים — כולל עלויות ההחזקה.' : 'המינוף הטריטוריאלי מוגבל.');

  push('iran_nuclear', 'האיום האיראני והגרעין', w('iran_nuclear'),
    100 - (m('iran_nuclear') * 0.5 + h('iran_nuclear_progress') * 0.5),
    h('iran_nuclear_progress') > 70 ? 'איראן על סף יכולת גרעינית צבאית — או מעברו.' : h('iran_nuclear_progress') > 40 ? 'התוכנית האיראנית נפגעה אך לא הוכרעה; הידע נותר.' : 'התוכנית האיראנית הושבתה לשנים קדימה.');

  push('us_alliance', 'הברית עם ארה״ב', w('us_alliance'), m('us_relations'),
    m('us_relations') > 60 ? 'הברית איתנה.' : m('us_relations') > 35 ? 'הברית שרדה עם צלקות.' : 'קרע עמוק עם וושינגטון — נכס אסטרטגי אבד.');

  push('intl_position', 'מעמד בינלאומי ולגיטימציה', w('intl_position'),
    m('intl_standing') * 0.65 + (100 - m('antisemitism')) * 0.35,
    m('antisemitism') > 60 ? 'הדה־לגיטימציה והאנטישמיות בעולם בשיא — תוצר של ביטחון אויב ותודעה.' : 'מעמדה של ישראל בעולם יציב יחסית.');

  push('economy_score', 'כלכלה', w('economy_score'),
    m('economy') - state.losses.filter((l) => l.kind === 'economy').length * 5,
    m('economy') > 55 ? 'המשק הפגין עמידות.' : 'המשק ספג נזק מבני שיידרש עשור לתקנו.');

  push('cohesion_score', 'לכידות וחוסן', w('cohesion_score'),
    m('social_cohesion') * 0.6 + m('resilience') * 0.4,
    m('social_cohesion') < 30 ? 'החברה הישראלית מפולגת ושסועה — נקודת התורפה שהאויב מהמר עליה.' : 'החברה שמרה על מרקם משותף תחת אש.');

  push('human_capital_score', 'הון אנושי ועתיד טכנולוגי', w('human_capital_score'),
    m('human_capital') * 0.6 + h('human_capital_trajectory') * 0.4,
    h('human_capital_trajectory') < 40 ? 'מגמת בריחת מוחות והתדרדרות חינוך מאיימת על היתרון האיכותי של 2035.' : 'הבסיס האנושי־טכנולוגי נשמר.');

  push('regional_order', 'הסדר האזורי ונורמליזציה', w('regional_order'),
    m('normalization') * 0.6 + (100 - m('enemy_coalition')) * 0.4,
    m('normalization') > 60 ? 'למדינות האזור יש כעת אינטרס ממשי בקיומה של ישראל.' : 'הקואליציה העוינת לא פוצלה באופן מהותי.');

  const activeWars = ['esc_gaza', 'esc_north', 'esc_iran', 'esc_yemen'].filter((k) => h(k) > 40).length;
  push('open_wars', 'מלחמות פתוחות וסיכוני עתיד', w('open_wars'),
    100 - activeWars * 18 - h('long_term_risk') * 0.35 - (m('reserve_burden') > 70 && activeWars > 0 ? 25 : 0),
    activeWars > 0 ? `${activeWars} זירות פעילות בסוף הריצה; מערך המילואים ${m('reserve_burden') > 70 ? 'קרוב לקריסה' : 'שחוק'}.` : 'הזירות שקטות — לפחות כרגע.');

  // --- composite with catastrophe caps
  let composite = dims.reduce((s, d) => s + d.score * d.weight, 0) / dims.reduce((s, d) => s + d.weight, 0);
  const caps: string[] = [];
  if (stateDestroyed) { composite = Math.min(composite, 3); caps.push('קריסת המדינה'); }
  if (state.losses.some((l) => l.kind === 'nuclear_attack')) { composite = Math.min(composite, 8); caps.push('פגיעה גרעינית'); }
  if (state.regions.israel?.status === 'contested') { composite = Math.min(composite, 30); caps.push('שטח ישראלי אבוד בסוף הריצה'); }
  if (m('reserve_burden') > 80 && activeWars > 0) { composite = Math.min(composite, 45); caps.push('קריסת מערך המילואים במלחמה פעילה'); }
  if (stillHeld > 20) { composite = Math.min(composite, 55); caps.push('עשרות חטופים ננטשו בשבי'); }
  composite = clamp(Math.round(composite));

  // --- long-term warnings (real achievements are not erased; risk is named)
  const warnings: string[] = [];
  if (h('human_capital_trajectory') < 40) warnings.push('מגמת ההון האנושי שלילית: חינוך, הייטק והגירה — היתרון האיכותי של העשור הבא בסכנה.');
  if (m('strategic_autonomy') < 25) warnings.push('התלות במעצמה זרה כמעט מוחלטת. ביום שבו האינטרסים יתפצלו — תיוותר ישראל חשופה.');
  if (h('iran_nuclear_progress') > 70) warnings.push('הגרעין האיראני לא הוכרע. השקט הנוכחי הוא שקט של ספירה לאחור.');
  if (h('enemy_confidence') > 70) warnings.push('אויבי ישראל השתכנעו שהיא שבירה. זו התשתית של המלחמה הבאה.');
  if (m('social_cohesion') < 25) warnings.push('הקרע הפנימי עמוק מכל איום חיצוני; אין חוסן לאומי בלי מרקם משותף.');
  if (h('long_term_risk') > 70) warnings.push('הסיכון המערכתי לעשור הקרוב גבוה: הישגי הטווח הקצר אינם מקובעים.');

  const positives = dims.filter((d) => d.score >= 65).map((d) => `${d.nameHe}: ${d.notesHe}`);
  const negatives = dims.filter((d) => d.score <= 40).map((d) => `${d.nameHe}: ${d.notesHe}`);
  const unresolved: string[] = [];
  if (activeWars > 0) unresolved.push('מלחמות פעילות שלא הוכרעו עד סוף התקופה.');
  if (h('gaza_governance_vacuum') > 50) unresolved.push('שאלת השלטון בעזה נותרה פתוחה — ואקום מזמין את הגרוע מכולם.');
  if (stillHeld > 0) unresolved.push(`${stillHeld} חטופים עדיין בשבי.`);
  if (!state.office.inOffice) unresolved.push('סיימת את התקופה מחוץ ללשכה; ההערכה שופטת את מצב המדינה, לא את שרידותך הפוליטית.');

  const explanationHe =
    `הציון ${composite} משקף בעיקר את תמונת הסיום: ${dims.filter((d) => d.score >= 65).length} ממדים חזקים, ${dims.filter((d) => d.score <= 40).length} חלשים` +
    (caps.length ? `, ותקרות שנכפו בשל: ${caps.join('; ')}` : '') +
    `. אבדות בלתי הפיכות נשקללו. אינני שופט האם החלטותיך היו סבירות בזמן אמת — רק את מה שנותר מהן בשטח. ` +
    (warnings.length ? 'לצד ההישגים, שים לב לאזהרות ארוכות הטווח.' : 'המסד שנבנה יציב גם במבט קדימה.');

  return {
    composite,
    dimensions: dims,
    positivesHe: positives,
    negativesHe: negatives,
    unresolvedHe: unresolved,
    longTermWarningsHe: warnings,
    baselineComparisonHe: scenario.scoring.baselineNoteHe,
    explanationHe,
  };
}
