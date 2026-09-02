// Canonical timeline — the historical spine (H0–H13) as engine data.
// Dates and figures verified against research/verified/* (Aug 2026 research
// pass). Anchors fire only while their own prerequisites hold; at high
// divergence they lose privilege entirely (engine/src/divergence.ts).
// Events after the execution date (2026-08-14) are simulated future by design:
// the only scheduled item is the already-legislated 2026-10-27 election, whose
// OUTCOME is simulated from run state.

import type { CanonicalAnchor, ScheduledEventSpec, TrendEffect, CommMessage, Prerequisite } from '../../engine/src/types.js';

const t = (target: string, deltaPerDay: number, days: number, reason: string): TrendEffect =>
  target.startsWith('$')
    ? { hiddenVar: target.slice(1), deltaPerDay, days, reason }
    : { metricId: target, deltaPerDay, days, reason };

const comm = (afterDays: number, senderId: string, senderHe: string, kind: CommMessage['kind'], textHe: string, regionId?: string, confidence?: 'high' | 'medium' | 'low') =>
  ({ afterDays, msg: { senderId, senderHe, kind, textHe, regionId, confidence } });

const prereqFired = (anchorId: string): Prerequisite => ({ kind: 'anchorFired', anchorId });

export const TIMELINE: CanonicalAnchor[] = [
  // ================================================================ H1 opening
  {
    id: 'oct7_attack', date: '2023-10-07', kind: 'enemy_action',
    titleHe: 'מתקפת הפתע', title: 'Hamas surprise attack',
    prerequisites: [{ kind: 'actorAlive', actorId: 'hamas' }],
    divergenceDims: ['events', 'hostages', 'territory'], windowDays: 120, weight: 3,
    sources: ['S01', 'S02', 'ledger:hostage_timeline'],
    plan: {
      trends: [
        t('deterrence', -14, 2, 'penetration proven'), t('social_cohesion', +0.8, 20, 'national rally'),
        t('gaza_position', -12, 2, 'strategic surprise'), t('economy', -2, 8, 'mobilization shock'),
        t('us_relations', +4, 3, 'US support surge'), t('intl_standing', +4, 3, 'initial sympathy'),
        t('$enemy_confidence', +10, 3, 'Israel proven penetrable'), t('$hostage_leverage', +30, 3, 'mass abduction'),
        t('$esc_gaza', +25, 3, 'war opens'), t('reserve_burden', +3, 10, 'mass mobilization'),
        t('public_pressure', +2.5, 6, 'shock and anger'),
      ],
      comms: [
        comm(0, 'israel_security', 'הרמטכ״ל', 'internal', 'חדירה רבתי בעוטף עזה. מאות מחבלים בשטחנו, יישובים נלחמים. הכוחות מוזנקים. היקף האבדות עדיין לא ידוע.', 'gaza', 'medium'),
        comm(0.5, 'israel_security', 'אגף המודיעין', 'intel', 'הערכה ראשונית: מאות הרוגים, עשרות עד מאות חטופים נלקחו לרצועה. אין עדיין תמונה מלאה.', 'gaza', 'low'),
        comm(1, 'hamas', 'דובר חמאס', 'hostile', 'אנו מכריזים על ניצחון היסטורי. הוכחנו שהכיבוש שביר. בידינו שבויים רבים.', 'gaza'),
        comm(1.5, 'usa', 'הבית הלבן', 'diplomatic', 'ארה״ב עומדת לצד ישראל באופן מוחלט. נושאת מטוסים בדרכה למזרח התיכון.', undefined, 'high'),
        comm(2, 'israel_public', 'הרחוב הישראלי', 'public', 'ההלם מוחלט. מאות אלפים מתייצבים למילואים; הציבור דורש תשובה — ותשובות.'),
      ],
      mapChanges: [
        { afterDays: 0, regionId: 'gaza', status: 'contested', intensity: 0.9 },
        { afterDays: 0, regionId: 'israel', intensity: 0.5, addOverlays: ['front_gaza', 'evacuated_south'] },
      ],
      events: [{
        afterDays: 1, event: {
          type: 'war_aims', titleHe: 'הגדרת מטרות המלחמה', urgency: 'urgent',
          descHe: 'הקבינט מתכנס. מערכת הביטחון מבקשת הנחיה אסטרטגית: מהי המטרה — מיטוט חמאס, השבת חטופים, או הרתעה מחודשת?',
          sourceHe: 'מזכיר הקבינט', regionId: 'gaza', anchor: [34.46, 31.5],
          options: [
            { id: 'aims_destroy', labelHe: 'מיטוט שלטון חמאס ויכולתו הצבאית', intent: 'order_destroy_hamas' },
            { id: 'aims_hostages', labelHe: 'החזרת החטופים בראש סדר העדיפויות', intent: 'order_hostages_first' },
            { id: 'aims_both', labelHe: 'שתי המטרות במקביל', intent: 'order_dual_aims' },
            { id: 'aims_ambiguous', labelHe: 'להימנע מהגדרה מחייבת כעת', intent: 'order_ambiguous_aims' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_dual_aims',
          defaultResolutionHe: 'בהיעדר הנחיה מדינית, מערכת הביטחון פועלת להשגת שתי המטרות במקביל, ללא סדר עדיפויות מוכרע.',
        },
      }],
      commitments: [],
    },
  },
  {
    id: 'hezbollah_limited_front', date: '2023-10-08', kind: 'enemy_action',
    titleHe: 'חזבאללה פותח זירה מוגבלת', title: 'Hezbollah opens limited front',
    prerequisites: [prereqFired('oct7_attack'), { kind: 'actorAlive', actorId: 'hezbollah', leader: true }],
    divergenceDims: ['events'], windowDays: 10, weight: 2, sources: ['S01'],
    plan: {
      trends: [t('north_position', -3, 5, 'northern fire begins'), t('$esc_north', +7, 5, 'limited front'), t('$hezbollah_strength', -0.08, 90, 'slow attrition of the limited front')],
      comms: [
        comm(0, 'hezbollah', 'חזבאללה', 'hostile', 'פתחנו באש "סולידריות" ברמת הגולן ובגבול. אנו עומדים לצד עזה — במידה שנבחר.', 'lebanon'),
        comm(0.5, 'israel_security', 'פיקוד הצפון', 'internal', 'ירי נ״ט ורקטות על יישובי הגבול. מומלץ פינוי יישובי קו העימות. חזבאללה שומר בשלב זה על אש מדודה.', 'lebanon', 'medium'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'lebanon', status: 'contested', intensity: 0.35, addOverlays: ['front_north'] }],
      events: [{
        afterDays: 0.5, event: {
          type: 'north_dilemma', titleHe: 'הזירה הצפונית: מכה מקדימה?', urgency: 'urgent',
          descHe: 'מערכת הביטחון מציגה חלון: מכה מקדימה בחזבאללה כעת — מול הסתפקות בהגנה והתמקדות בעזה. חזבאללה במלוא כוחו.',
          sourceHe: 'פורום המטה הכללי', regionId: 'lebanon', anchor: [35.4, 33.35],
          options: [
            { id: 'north_preempt', labelHe: 'לתקוף את חזבאללה עכשיו', intent: 'order_north_preempt' },
            { id: 'north_defense', labelHe: 'הגנה בצפון, עזה תחילה', intent: 'order_gaza_first' },
            { id: 'north_ask', labelHe: 'לבקש הערכת סיכונים', intent: 'ask_assessment' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_gaza_first',
          defaultResolutionHe: 'בהיעדר הכרעה, צה״ל נערך להגנה בצפון ומרכז את המאמץ בעזה, בהתאם להמלצת המטה.',
        },
      }],
    },
  },
  {
    id: 'us_support_surge', date: '2023-10-10', kind: 'exogenous',
    titleHe: 'גיבוי אמריקאי מלא', title: 'US carriers and support surge',
    prerequisites: [prereqFired('oct7_attack')],
    divergenceDims: ['alliances'], windowDays: 8, weight: 1, sources: ['S01', 'ledger:us_policy'],
    plan: {
      trends: [t('us_relations', +2, 5, 'carrier groups + airlift'), t('$us_intervention_willingness', +2, 10, 'deterrent posture')],
      comms: [comm(0, 'usa', 'הנשיא האמריקאי', 'diplomatic', 'המסר שלי לכל גורם עוין: אל תנסו. שתי נושאות מטוסים בדרך. הסיוע הביטחוני יוגבר מיידית.', undefined, 'high')],
    },
  },
  {
    id: 'ground_op_north_gaza', date: '2023-10-27', kind: 'israeli_decision', decisionIntent: 'order_ground_op',
    titleHe: 'תמרון קרקעי בעזה', title: 'Ground operation, northern Gaza',
    prerequisites: [prereqFired('oct7_attack')],
    divergenceDims: ['policy', 'territory'], windowDays: 25, weight: 3, sources: ['S01'],
    plan: {
      trends: [
        t('gaza_position', +0.7, 30, 'maneuver gains'), t('$hamas_strength', -0.8, 60, 'attrition'),
        t('$territorial_leverage', +0.8, 60, 'ground control'), t('intl_standing', -0.5, 60, 'humanitarian pressure'),
        t('reserve_burden', +0.5, 60, 'sustained maneuver'), t('$esc_gaza', +10, 5, 'ground war'),
      ],
      comms: [
        comm(0, 'israel_security', 'הרמטכ״ל', 'internal', 'הכוחות נכנסו. התקדמות בצפון הרצועה. צפי לאבדות; חמאס נלחם מתוך תשתית תת־קרקעית.', 'gaza', 'medium'),
        comm(3, 'hamas', 'חמאס', 'hostile', 'הכובש יטבע בחולות עזה. השבויים שבידינו ישלמו את מחיר התוקפנות.', 'gaza'),
      ],
      mapChanges: [{ afterDays: 3, regionId: 'gaza', status: 'contested', intensity: 1, addOverlays: ['idf_north_gaza'] }],
      events: [{
        afterDays: 0.2, event: {
          type: 'ground_op', titleHe: 'אישור התמרון הקרקעי', urgency: 'urgent',
          descHe: 'צה״ל ערוך לתמרון קרקעי רחב בצפון הרצועה. נדרש אישור מדיני. המודיעין: מחיר בחיי חיילים ודאי; השפעה על חטופים — לא ודאית.',
          sourceHe: 'לשכת שר הביטחון', regionId: 'gaza', anchor: [34.46, 31.52],
          options: [
            { id: 'go_approve', labelHe: 'לאשר תמרון רחב', intent: 'order_ground_op' },
            { id: 'go_limited', labelHe: 'פשיטות מוגבלות בלבד', intent: 'order_raids_only' },
            { id: 'go_delay', labelHe: 'להמתין — מיצוי מו״מ תחילה', intent: 'order_delay_ground' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_limited_raids',
          defaultResolutionHe: 'בהיעדר אישור, צה״ל מבצע פשיטות מוגבלות בשולי הרצועה בהתאם לסמכות הקיימת.',
        },
      }],
    },
  },
  {
    id: 'houthi_redsea', date: '2023-11-19', kind: 'enemy_action',
    titleHe: 'החות׳ים תוקפים בים סוף', title: 'Houthi Red Sea campaign begins',
    prerequisites: [prereqFired('oct7_attack'), { kind: 'actorAlive', actorId: 'houthis' }],
    divergenceDims: ['events'], windowDays: 20, weight: 1, sources: ['S01'],
    plan: {
      trends: [t('economy', -0.15, 90, 'shipping rerouted'), t('$esc_yemen', +3, 10, 'naval front')],
      comms: [
        comm(0, 'houthis', 'החות׳ים', 'hostile', 'כל ספינה בדרכה לישראל היא מטרה לגיטימית. ים סוף סגור בפני אוניות האויב.', 'red_sea'),
        comm(1, 'israel_security', 'חיל הים', 'internal', 'חטיפת ה"גלקסי לידר" ושיגורים לעבר אילת. נתיב באב אל־מנדב בסיכון; חברות ספנות שוקלות עקיפה סביב אפריקה.', 'red_sea', 'high'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'red_sea', status: 'contested', intensity: 0.5, addOverlays: ['naval_threat'] }],
    },
  },
  {
    id: 'hostage_deal_1', date: '2023-11-22', kind: 'israeli_decision', decisionIntent: 'accept_deal',
    titleHe: 'עסקת החטופים הראשונה', title: 'First hostage deal (105 released)',
    prerequisites: [prereqFired('oct7_attack'), { kind: 'hostagesHeldMin', min: 50 }],
    divergenceDims: ['hostages', 'policy'], windowDays: 30, weight: 3, sources: ['S02', 'ledger:hostage_timeline'],
    plan: {
      trends: [
        t('hostages_metric', +5, 7, '105 released'), t('$hostage_leverage', -1.2, 7, 'fewer held'),
        t('public_pressure', -1.5, 10, 'relief'), t('$hamas_strength', +0.3, 7, 'pause used to regroup'),
        t('intl_standing', +1, 7, 'deal welcomed'),
      ],
      comms: [
        comm(0, 'qatar', 'התיווך הקטארי', 'diplomatic', 'חמאס מוכן לשחרור כמאה נשים וילדים תמורת הפוגה, אסירים וכניסת סיוע. ההצעה מוגבלת בזמן.', undefined, 'medium'),
        comm(2, 'israel_public', 'משפחות החטופים', 'public', 'הכיכרות מלאות. המשפחות דורשות: אל תחמיצו את ההזדמנות להחזיר אותם.'),
      ],
      events: [{
        afterDays: 0.1, event: {
          type: 'hostage_deal', titleHe: 'מתווה עסקה: הפוגה תמורת חטופים', urgency: 'urgent',
          descHe: 'מתווך קטארי־מצרי: שחרור ~50 נשים וילדים בשלב ראשון (עם אופציית הרחבה), תמורת הפוגה של ימים, שחרור אסירים והכנסת סיוע. חמאס ינצל את ההפוגה להתארגנות.',
          sourceHe: 'צוות המו״מ', regionId: 'gaza', anchor: [34.4, 31.45],
          options: [
            { id: 'deal_accept', labelHe: 'לאשר את המתווה', intent: 'accept_deal' },
            { id: 'deal_reject', labelHe: 'לדחות ולהמשיך בלחץ צבאי', intent: 'reject_deal' },
            { id: 'deal_improve', labelHe: 'לדרוש תנאים משופרים', intent: 'counter_deal' },
            { id: 'deal_ask', labelHe: 'לשאול את ראש המוסד', intent: 'ask_assessment' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'בהיעדר הכרעה, חלון המתווה נסגר. המתווכים מדווחים כי חמאס הקשיח עמדות.',
        },
      }],
      commitments: [{ day: 0, byActor: 'israel', toward: 'hamas', kind: 'ceasefire', textHe: 'הפוגה זמנית תמורת שחרור חטופים — תקדים עסקאות נוצר.', weight: 0.6 }],
    },
  },
  {
    id: 'fighting_resumes_dec23', date: '2023-12-01', kind: 'exogenous',
    titleHe: 'חידוש הלחימה', title: 'Fighting resumes after pause',
    prerequisites: [prereqFired('hostage_deal_1')],
    divergenceDims: ['events'], windowDays: 15, weight: 1, sources: ['S02'],
    plan: {
      trends: [t('$esc_gaza', +8, 3, 'pause collapses'), t('gaza_position', +0.5, 20, 'Khan Younis push')],
      comms: [comm(0, 'israel_security', 'דובר צה״ל', 'internal', 'חמאס הפר את ההפוגה בירי. הלחימה חודשה; המאמץ עובר לחאן יונס.', 'gaza', 'high')],
    },
  },
  // ================================================================ H3 2024
  {
    id: 'damascus_consulate', date: '2024-04-01', kind: 'israeli_decision', decisionIntent: 'approve_covert',
    titleHe: 'סיכול בכיר איראני בדמשק', title: 'Damascus IRGC strike',
    prerequisites: [prereqFired('oct7_attack'), { kind: 'actorAlive', actorId: 'iran' }],
    divergenceDims: ['policy'], windowDays: 30, weight: 2, sources: ['S09'],
    plan: {
      trends: [t('$esc_iran', +7, 5, 'direct-attack threshold approached')],
      comms: [comm(0, 'israel_security', 'ראש המוסד', 'intel', 'הזדמנות: בכירי כוח קודס במבנה סמוך לשגרירות בדמשק. פגיעה תשבש את ציר הנשק — אך עלולה לגרור תגובה איראנית ישירה.', 'syria', 'high')],
      events: [{
        afterDays: 0, event: {
          type: 'intel_opportunity', titleHe: 'הזדמנות מודיעינית בדמשק', urgency: 'immediate',
          descHe: 'חלון תקיפה על מפקדים בכירים בכוח קודס. המודיעין מעריך: פגיעה קשה בציר האספקה. סיכון לתגובה איראנית ישירה — קשה לכימות.',
          sourceHe: 'ראש המוסד', regionId: 'syria', anchor: [36.3, 33.5],
          options: [
            { id: 'dc_approve', labelHe: 'לאשר את התקיפה', intent: 'approve_covert' },
            { id: 'dc_decline', labelHe: 'לוותר על ההזדמנות', intent: 'decline_covert' },
            { id: 'dc_ask', labelHe: 'לבקש הערכת תגובה איראנית', intent: 'ask_assessment' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_covert_lapse',
          defaultResolutionHe: 'החלון נסגר בטרם התקבלה הנחיה. המטרות התפזרו.',
        },
      }],
    },
  },
  {
    id: 'iran_direct_attack_1', date: '2024-04-13', kind: 'enemy_action',
    titleHe: 'מתקפה איראנית ישירה ראשונה', title: 'First direct Iranian attack (~300 projectiles)',
    prerequisites: [prereqFired('damascus_consulate'), { kind: 'actorAlive', actorId: 'iran', leader: true }],
    divergenceDims: ['capability', 'events'], windowDays: 20, weight: 3, sources: ['S09', 'ledger:capability_notes'],
    plan: {
      trends: [
        t('$esc_iran', +15, 3, 'threshold crossed'), t('deterrence', +2, 5, 'interception success'),
        t('us_relations', +1.5, 5, 'coalition defense'), t('normalization', +0.8, 10, 'regional cooperation revealed'),
      ],
      comms: [
        comm(0, 'iran', 'דובר משמרות המהפכה', 'hostile', 'מבצע "ההבטחה האמיתית": מאות כטב״מים וטילים שוגרו לעבר הישות הציונית. עונש על דמשק.', 'iran'),
        comm(0.7, 'israel_security', 'חיל האוויר', 'internal', 'כ־300 שיגורים. יירוט של ~99% בסיוע קואליציה אמריקאית־אזורית. נזק קל בנבטים. ההגנה עמדה — הפעם.', undefined, 'high'),
        comm(1.5, 'usa', 'הבית הלבן', 'diplomatic', 'ההגנה על ישראל מוחלטת. אך אנו מצפים לריסון: "קחו את הניצחון". לא נתמוך במתקפת נגד רחבה.', undefined, 'high'),
      ],
      events: [{
        afterDays: 1, event: {
          type: 'retaliation_dilemma', titleHe: 'תגובה לאיראן?', urgency: 'urgent',
          descHe: 'איראן חצתה סף היסטורי בתקיפה ישירה. וושינגטון לוחצת לריסון. מערכת הביטחון מציגה קשת תגובות — ממדודה ועד רחבה.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'iran', anchor: [51.4, 35.7],
          options: [
            { id: 'ret_measured', labelHe: 'תגובה מדודה ומדויקת', intent: 'order_measured_retaliation' },
            { id: 'ret_broad', labelHe: 'מתקפה רחבה על איראן', intent: 'order_broad_retaliation' },
            { id: 'ret_none', labelHe: 'להבליג ולשמר את הקואליציה', intent: 'order_no_retaliation' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
          defaultResolutionHe: 'בהיעדר הנחיה, צה״ל ביצע תגובה מדודה מוגבלת בהתאם להמלצת המטה והתיאום עם וושינגטון.',
        },
      }],
    },
  },
  {
    id: 'rafah_op', date: '2024-05-06', kind: 'israeli_decision', decisionIntent: 'order_rafah',
    titleHe: 'המבצע ברפיח וציר פילדלפי', title: 'Rafah operation + Philadelphi',
    prerequisites: [prereqFired('ground_op_north_gaza')],
    divergenceDims: ['policy', 'territory'], windowDays: 45, weight: 2, sources: ['S01', 'S13'],
    plan: {
      trends: [
        t('gaza_position', +0.4, 40, 'border control'), t('$territorial_leverage', +0.6, 60, 'Philadelphi corridor'),
        t('$hamas_strength', -0.5, 60, 'smuggling cut'), t('us_relations', -0.8, 15, 'weapons-pause friction'),
        t('intl_standing', -0.6, 20, 'Rafah pressure'),
      ],
      comms: [
        comm(0, 'egypt', 'קהיר', 'diplomatic', 'מצרים מזהירה: פעולה ברפיח וסביב הציר תסכן את הסכם השלום ואת שיתוף הפעולה. לא נקבל דחיקת אוכלוסייה לסיני.', 'egypt', 'high'),
        comm(2, 'usa', 'מחלקת המדינה', 'diplomatic', 'הנשיא הורה לעכב משלוח פצצות כבדות. תמיכתנו אינה בלתי מותנית בכל הנוגע לרפיח.', undefined, 'high'),
        comm(6, 'israel_security', 'אוגדת עזה', 'internal', 'השליטה בציר פילדלפי נבנית. נחשפו עשרות מנהרות הברחה חוצות גבול.', 'gaza', 'high'),
      ],
      mapChanges: [{ afterDays: 5, regionId: 'gaza', addOverlays: ['idf_philadelphi', 'idf_rafah'] }],
      events: [{
        afterDays: 0.1, event: {
          type: 'rafah_decision', titleHe: 'רפיח: להיכנס?', urgency: 'window',
          descHe: 'ארבעה גדודי חמאס ברפיח, וציר ההברחות חוצה מתחתיה. ארה״ב ומצרים מתנגדות לכניסה רחבה. המטה מציג: בלי רפיח אין ניתוק של חמאס מהעולם.',
          sourceHe: 'פורום המטה הכללי', regionId: 'gaza', anchor: [34.25, 31.28],
          options: [
            { id: 'rafah_go', labelHe: 'להיכנס לרפיח ולציר', intent: 'order_rafah' },
            { id: 'rafah_wait', labelHe: 'לעכב לטובת עסקה', intent: 'order_delay_rafah' },
            { id: 'rafah_raid', labelHe: 'פשיטות נקודתיות בלבד', intent: 'order_raids_only' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_rafah_delay',
          defaultResolutionHe: 'בהיעדר הכרעה, הכוחות נערכים סביב רפיח ללא כניסה — הלחץ הבינלאומי גובר והציר נותר פתוח.',
        },
      }],
    },
  },
  {
    id: 'nuseirat_rescue', date: '2024-06-08', kind: 'exogenous',
    titleHe: 'חילוץ ארבעה חטופים', title: 'Nuseirat rescue',
    prerequisites: [prereqFired('ground_op_north_gaza'), { kind: 'hostagesHeldMin', min: 20 }],
    divergenceDims: ['hostages'], windowDays: 40, weight: 1, sources: ['ledger:hostage_timeline'],
    plan: {
      trends: [t('hostages_metric', +3, 3, 'four rescued alive'), t('social_cohesion', +2, 5, 'national morale'), t('intl_standing', -1, 8, 'civilian toll criticism')],
      comms: [comm(0, 'israel_security', 'דובר צה״ל', 'outcome', 'ארבעה חטופים חולצו בחיים במבצע מיוחד בנוסיירת. מחיר כבד בקרב: קצין ימ״מ נפל, ואבדות רבות בצד הפלסטיני.', 'gaza', 'high')],
    },
  },
  {
    id: 'gantz_exit', date: '2024-06-09', kind: 'exogenous',
    titleHe: 'פרישת מחנה המדינה מהממשלה', title: 'War-cabinet partner exits',
    prerequisites: [prereqFired('oct7_attack')],
    divergenceDims: ['domestic'], windowDays: 30, weight: 1, sources: ['ledger:israel_domestic'],
    plan: {
      trends: [t('coalition_stability', -1.2, 5, 'unity government narrows'), t('public_pressure', +0.8, 10, 'day-after criticism')],
      comms: [comm(0, 'israel_public', 'האופוזיציה', 'public', 'שותף מרכזי פורש מממשלת החירום: "אין תוכנית ליום שאחרי". הקואליציה חוזרת לבסיסה הצר.')],
    },
  },
  {
    id: 'haniyeh_killed', date: '2024-07-31', kind: 'israeli_decision', decisionIntent: 'approve_covert',
    titleHe: 'סיכול ראש הלשכה המדינית של חמאס', title: 'Haniyeh killed in Tehran',
    prerequisites: [prereqFired('oct7_attack'), { kind: 'actorAlive', actorId: 'hamas' }],
    divergenceDims: ['leadership', 'policy'], windowDays: 40, weight: 2, sources: ['S09'],
    plan: {
      trends: [t('deterrence', +1, 10, 'reach demonstrated'), t('$esc_iran', +2, 10, 'humiliation in Tehran'), t('$hostage_leverage', +0.5, 20, 'negotiation freeze')],
      comms: [
        comm(0, 'israel_security', 'ראש המוסד', 'intel', 'חלון חד־פעמי: ראש הלשכה המדינית של חמאס בביקור בטהראן, במתחם מאובטח שבידינו גישה אליו. פגיעה תשדר עומק חדירה — אך עלולה להקפיא את המו״מ.', 'iran', 'high'),
      ],
      events: [{
        afterDays: 0, event: {
          type: 'intel_opportunity', titleHe: 'הזדמנות בטהראן', urgency: 'immediate',
          descHe: 'יעד בכיר בטווח פגיעה בלב טהראן. אישור יידרש עכשיו. ההשלכות: הרתעה מול הקפאת ערוץ העסקה, וסיכון תגובה איראנית.',
          sourceHe: 'ראש המוסד', regionId: 'iran', anchor: [51.4, 35.7],
          options: [
            { id: 'han_go', labelHe: 'לאשר', intent: 'approve_covert' },
            { id: 'han_no', labelHe: 'לא לאשר', intent: 'decline_covert' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_covert_lapse',
          defaultResolutionHe: 'החלון חלף ללא הנחיה. היעד עזב את המתחם.',
        },
      }],
    },
  },
  // ================================================================ H5 north
  {
    id: 'pager_operation', date: '2024-09-17', kind: 'israeli_decision', decisionIntent: 'approve_covert',
    titleHe: 'מבצע אמצעי הקשר', title: 'Pager operation',
    prerequisites: [{ kind: 'actorAlive', actorId: 'hezbollah' }, prereqFired('hezbollah_limited_front')],
    divergenceDims: ['capability', 'policy'], windowDays: 60, weight: 3, sources: ['S03'],
    plan: {
      trends: [
        t('$hezbollah_strength', -4, 5, 'command disruption'), t('deterrence', +1.5, 8, 'penetration revealed'),
        t('north_position', +1.5, 10, 'initiative shifts'), t('$esc_north', +15, 5, 'campaign opens'),
      ],
      comms: [
        comm(0, 'israel_security', 'ראש אמ״ן', 'intel', 'היכולת שהוטמעה באמצעי הקשר של חזבאללה בשלה. חשיפתה מתקרבת — "השתמש או אבד". הפעלה תשבש את שרשרת הפיקוד לימים קריטיים.', 'lebanon', 'high'),
        comm(1, 'hezbollah', 'חזבאללה', 'hostile', 'הפיגוע הטכנולוגי הרצחני לא יישאר ללא מענה. נפגעו אלפים מאנשינו.', 'lebanon'),
      ],
      events: [{
        afterDays: 0, event: {
          type: 'covert_window', titleHe: 'יכולת חשאית: להפעיל?', urgency: 'immediate',
          descHe: 'יכולת רבת־שנים באמצעי הקשר של חזבאללה עומדת בפני חשיפה. הפעלה עכשיו תפתח חלון לשיבוש הארגון כולו. ויתור — כנראה לצמיתות.',
          sourceHe: 'ראש אמ״ן', regionId: 'lebanon', anchor: [35.5, 33.84],
          options: [
            { id: 'pg_go', labelHe: 'להפעיל ולנצל את החלון', intent: 'approve_covert' },
            { id: 'pg_hold', labelHe: 'לא להפעיל', intent: 'decline_covert' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_covert_lapse',
          defaultResolutionHe: 'היכולת נחשפה בטרם הופעלה ואבדה.',
        },
      }],
    },
  },
  {
    id: 'nasrallah_killed', date: '2024-09-27', kind: 'israeli_decision', decisionIntent: 'approve_covert',
    titleHe: 'חיסול מזכ״ל חזבאללה', title: 'Nasrallah killed',
    prerequisites: [prereqFired('pager_operation'), { kind: 'actorAlive', actorId: 'hezbollah', leader: true }],
    divergenceDims: ['leadership', 'actor_survival'], windowDays: 30, weight: 3, sources: ['S03', 'S08'],
    plan: {
      trends: [
        t('$hezbollah_strength', -3.5, 10, 'decapitation'), t('deterrence', +2, 10, 'strategic shock'),
        t('north_position', +1.5, 15, 'command vacuum'), t('$enemy_confidence', -1.5, 20, 'axis shaken'),
        t('$iran_proxy_control', +1, 30, 'IRGC steps in'),
      ],
      comms: [
        comm(0, 'israel_security', 'הרמטכ״ל', 'outcome', 'מזכ״ל חזבאללה חוסל בתקיפה בדאחיה. שרשרת הפיקוד של הארגון בהלם. נערכים לתגובה איראנית.', 'lebanon', 'high'),
        comm(1.5, 'iran', 'המנהיג העליון', 'hostile', 'דם השהיד לא יישפך לשווא. הציר ימשיך בדרכו; הנקמה בוא תבוא.', 'iran'),
      ],
      events: [{
        afterDays: 0, event: {
          type: 'decapitation', titleHe: 'המזכ״ל בכוונת', urgency: 'immediate',
          descHe: 'מודיעין מדויק: מזכ״ל חזבאללה במפקדה התת־קרקעית בדאחיה. נדרש אישור לתקיפה רבת־עוצמה בלב ביירות.',
          sourceHe: 'ראש אמ״ן', regionId: 'lebanon', anchor: [35.5, 33.84],
          options: [
            { id: 'nas_go', labelHe: 'לאשר את התקיפה', intent: 'approve_covert' },
            { id: 'nas_no', labelHe: 'להימנע', intent: 'decline_covert' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_covert_lapse',
          defaultResolutionHe: 'היעד עזב את המפקדה. ההזדמנות חלפה.',
        },
      }],
    },
  },
  {
    id: 'iran_direct_attack_2', date: '2024-10-01', kind: 'enemy_action',
    titleHe: 'מתקפת טילים איראנית שנייה', title: 'Second direct Iranian attack (~180 BM)',
    prerequisites: [prereqFired('nasrallah_killed'), { kind: 'actorAlive', actorId: 'iran', leader: true }],
    divergenceDims: ['capability'], windowDays: 15, weight: 2, sources: ['S09'],
    plan: {
      trends: [t('$esc_iran', +12, 5, 'second salvo'), t('$military_stocks', -4, 5, 'interceptor burn')],
      comms: [
        comm(0, 'iran', 'משמרות המהפכה', 'hostile', 'כ־200 טילים בליסטיים שוגרו — נקמת נסראללה וניה. זו רק ההתחלה.', 'iran'),
        comm(0.5, 'israel_security', 'פיקוד העורף', 'internal', 'רוב הטילים יורטו; פגיעות בבסיסים. מלאי המיירטים נשחק — נדרש חידוש אמריקאי.', undefined, 'medium'),
      ],
    },
  },
  {
    id: 'lebanon_ground_op', date: '2024-10-01', kind: 'israeli_decision', decisionIntent: 'order_ground_op',
    titleHe: 'תמרון קרקעי בדרום לבנון', title: 'Lebanon ground operation',
    prerequisites: [prereqFired('nasrallah_killed')],
    divergenceDims: ['policy', 'territory'], windowDays: 25, weight: 2, sources: ['S08'],
    plan: {
      trends: [t('north_position', +0.8, 30, 'pushback from border'), t('$hezbollah_strength', -0.6, 45, 'infrastructure cleared'), t('reserve_burden', +0.6, 45, 'two-front maneuver')],
      comms: [comm(1, 'israel_security', 'פיקוד הצפון', 'internal', 'הכוחות פועלים בכפרי קו העימות. נחשפות מנהרות תקיפה לעבר הגליל.', 'lebanon', 'high')],
      mapChanges: [{ afterDays: 2, regionId: 'lebanon', status: 'contested', intensity: 0.8, addOverlays: ['idf_south_lebanon'] }],
      events: [{
        afterDays: 0.1, event: {
          type: 'ground_op', titleHe: 'כניסה קרקעית ללבנון?', urgency: 'urgent',
          descHe: 'חזבאללה מוכה אך יורה. המטה ממליץ על תמרון מוגבל לחיסול תשתית קו העימות והרחקת הנ״ט מהיישובים.',
          sourceHe: 'פורום המטה הכללי', regionId: 'lebanon', anchor: [35.4, 33.2],
          options: [
            { id: 'lb_go', labelHe: 'לאשר תמרון מוגבל', intent: 'order_ground_op' },
            { id: 'lb_air', labelHe: 'להסתפק באש מנגד', intent: 'order_air_only' },
            { id: 'lb_deep', labelHe: 'תמרון עמוק עד הליטני', intent: 'order_deep_op' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_air_only',
          defaultResolutionHe: 'בהיעדר אישור, צה״ל ממשיך באש מנגד בלבד.',
        },
      }],
    },
  },
  {
    id: 'sinwar_killed', date: '2024-10-16', kind: 'exogenous',
    titleHe: 'סינוואר חוסל', title: 'Sinwar killed in combat encounter',
    prerequisites: [prereqFired('ground_op_north_gaza'), { kind: 'actorAlive', actorId: 'hamas', leader: true }],
    divergenceDims: ['leadership'], windowDays: 60, weight: 2, sources: ['S09'],
    plan: {
      trends: [t('deterrence', +1.2, 10, 'symbol falls'), t('$hamas_strength', -1.5, 15, 'leadership blow'), t('social_cohesion', +1, 8, 'justice served')],
      comms: [
        comm(0, 'israel_security', 'דובר צה״ל', 'outcome', 'יחיא סינוואר, אדריכל הטבח, חוסל במפגש קרבי ברפיח. חמאס טרם הודיע על יורש בעזה.', 'gaza', 'high'),
        comm(2, 'hamas', 'חמאס', 'hostile', 'השהיד נפל כלוחם בשדה הקרב, פנים אל האויב. דרכו תימשך. השבויים לא ישוחררו אלא בתנאינו.', 'gaza'),
      ],
    },
  },
  {
    id: 'israel_strikes_iran_defenses', date: '2024-10-26', kind: 'israeli_decision', decisionIntent: 'order_measured_retaliation',
    titleHe: 'תקיפת מערכי ההגנה באיראן', title: 'Strike on Iranian air defenses',
    prerequisites: [prereqFired('iran_direct_attack_2')],
    divergenceDims: ['capability'], windowDays: 30, weight: 2, sources: ['S09'],
    plan: {
      trends: [t('$esc_iran', -2, 20, 'round closes'), t('deterrence', +1, 15, 'air superiority path'), t('iran_nuclear', -1, 10, 'defense degradation')],
      comms: [comm(0.5, 'israel_security', 'חיל האוויר', 'outcome', 'הושמדו סוללות S-300 ומערך ייצור דלק רקטי. השמיים בדרך לאיראן פתוחים מאי־פעם. איראן בחרה שלא להגיב בשלב זה.', 'iran', 'high')],
      events: [{
        afterDays: 0, event: {
          type: 'retaliation_dilemma', titleHe: 'תגובה למטח האיראני השני', urgency: 'urgent',
          descHe: 'כ־200 טילים בליסטיים נורו על ישראל. המטה מציג תגובה מדויקת: השמדת מערך ההגנה האווירית האיראני — צעד שיפתח את השמיים לעתיד.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'iran', anchor: [51.2, 34.5],
          options: [
            { id: 'ret2_def', labelHe: 'להשמיד את ההגנה האווירית', intent: 'order_measured_retaliation' },
            { id: 'ret2_broad', labelHe: 'לתקוף גם גרעין ואנרגיה', intent: 'order_broad_retaliation' },
            { id: 'ret2_none', labelHe: 'להבליג', intent: 'order_no_retaliation' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
          defaultResolutionHe: 'בהיעדר הנחיה, בוצעה תגובה מוגבלת בתיאום עם וושינגטון.',
        },
      }],
    },
  },
  // ================================================================ H6 Lebanon deal + Syria
  {
    id: 'lebanon_ceasefire', date: '2024-11-27', kind: 'israeli_decision', decisionIntent: 'accept_deal',
    titleHe: 'הפסקת אש בלבנון', title: 'Lebanon ceasefire',
    prerequisites: [prereqFired('lebanon_ground_op')],
    divergenceDims: ['policy', 'commitments'], windowDays: 40, weight: 2, sources: ['S08'],
    plan: {
      trends: [t('north_position', +1, 20, 'quiet returns'), t('$esc_north', -15, 10, 'ceasefire'), t('reserve_burden', -1, 30, 'demobilization north')],
      comms: [
        comm(0, 'usa', 'המתווך האמריקאי', 'diplomatic', 'מתווה 60 היום: נסיגת חזבאללה מעבר לליטני, פריסת צבא לבנון, וחופש פעולה ישראלי נגד הפרות. מומלץ לאשר.', undefined, 'high'),
        comm(3, 'israel_public', 'תושבי הצפון', 'public', 'שנה מחוץ לבית. חלק חוזרים בזהירות; אחרים שואלים אם ההסדר יחזיק מעמד.'),
      ],
      mapChanges: [{ afterDays: 1, regionId: 'lebanon', status: 'normal', intensity: 0.2, removeOverlays: ['idf_south_lebanon'], addOverlays: ['ceasefire_line'] }],
      commitments: [{ day: 0, byActor: 'israel', toward: 'lebanon_state', kind: 'ceasefire', textHe: 'הפסקת אש בלבנון עם חופש פעולה נגד הפרות.', weight: 0.7 }],
      events: [{
        afterDays: 0.1, event: {
          type: 'ceasefire_offer', titleHe: 'מתווה הפסקת אש בצפון', urgency: 'window',
          descHe: 'חזבאללה מוכה; ארה״ב מציעה מתווה המרחיק אותו מהגבול ומציב את צבא לבנון בדרום. המטה: הישג — אך תלוי באכיפה.',
          sourceHe: 'המועצה לביטחון לאומי', regionId: 'lebanon', anchor: [35.5, 33.5],
          options: [
            { id: 'lbcf_yes', labelHe: 'לאשר את המתווה', intent: 'accept_deal' },
            { id: 'lbcf_no', labelHe: 'להמשיך במערכה', intent: 'reject_deal' },
            { id: 'lbcf_cond', labelHe: 'לדרוש אכיפה קשיחה יותר', intent: 'counter_deal' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'המתווה קפא ללא הכרעה; הלחימה בצפון נמשכת בעצימות משתנה.',
        },
      }],
    },
  },
  {
    id: 'assad_collapse', date: '2024-12-08', kind: 'exogenous',
    titleHe: 'קריסת משטר אסד', title: 'Assad regime collapse',
    prerequisites: [{ kind: 'hiddenVarMax', varId: 'hezbollah_strength', max: 55 }, { kind: 'actorAlive', actorId: 'syria_regime' }],
    divergenceDims: ['actor_survival', 'territory'], windowDays: 90, weight: 3, sources: ['S04', 'S17'],
    plan: {
      trends: [
        t('$syria_stability', -20, 5, 'regime falls'), t('$iran_proxy_control', -2, 30, 'corridor severed'),
        t('north_position', +0.8, 30, 'axis logistics cut'), t('$enemy_confidence', -1, 30, 'axis collapse'),
      ],
      comms: [
        comm(0, 'israel_security', 'ראש אמ״ן', 'intel', 'דמשק נפלה. המורדים בארמון; אסד נמלט למוסקבה. ציר האספקה האיראני לחזבאללה קרס. חלון הזדמנויות — וסיכונים.', 'syria', 'high'),
        comm(1, 'russia', 'הקרמלין', 'diplomatic', 'רוסיה ממקדת את נכסיה בבסיסי החוף. עתיד סוריה ייקבע על ידי הסורים.', 'syria', 'medium'),
        comm(2, 'turkey', 'אנקרה', 'diplomatic', 'עידן חדש בסוריה. טורקיה תעמוד לצד הממשל החדש בייצוב המדינה.', 'syria', 'medium'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'syria', status: 'fragmented', intensity: 0.6 }],
      events: [{
        afterDays: 0.3, event: {
          type: 'syria_opportunity', titleHe: 'סוריה החדשה: מה עושים?', urgency: 'urgent',
          descHe: 'המשטר קרס. מערכי נשק אסטרטגי — טילים, הגנ״א, צי — עומדים ללא בעלים. המטה מציע: השמדה מקיפה + תפיסת חיץ בחרמון. הממשל החדש — עלום.',
          sourceHe: 'פורום המטה הכללי', regionId: 'syria', anchor: [36.3, 33.5],
          options: [
            { id: 'sy_strike', labelHe: 'להשמיד את הנשק ולתפוס חיץ', intent: 'order_syria_strikes' },
            { id: 'sy_wait', labelHe: 'להמתין ולבחון את הממשל החדש', intent: 'order_restraint' },
            { id: 'sy_engage', labelHe: 'לפתוח ערוץ למשטר החדש', intent: 'diplomacy_syria' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_syria_partial',
          defaultResolutionHe: 'בהיעדר הנחיה, צה״ל תקף יעדים דחופים בלבד; חלק מהמערכים נבזז בידי גורמים לא מזוהים.',
        },
      }],
    },
  },
  {
    id: 'syria_strikes_buffer', date: '2024-12-10', kind: 'israeli_decision', decisionIntent: 'order_syria_strikes',
    titleHe: 'השמדת הנשק הסורי ותפיסת החיץ', title: 'Syria strikes + buffer entry',
    prerequisites: [prereqFired('assad_collapse')],
    divergenceDims: ['territory', 'capability'], windowDays: 30, weight: 2, sources: ['S04'],
    plan: {
      trends: [t('north_position', +1, 20, 'strategic depth'), t('deterrence', +1, 15, 'freedom of action'), t('iran_nuclear', -2, 15, 'air route open'), t('$territorial_leverage', +0.5, 60, 'Hermon positions')],
      comms: [comm(1, 'israel_security', 'חיל האוויר', 'outcome', 'למעלה מ־350 תקיפות: הגנ״א, טילים, צי ומערכי ייצור הושמדו. כוחותינו נערכו ברצועת החיץ ובפסגת החרמון.', 'syria', 'high')],
      mapChanges: [{ afterDays: 1, regionId: 'syria', addOverlays: ['idf_buffer_hermon', 'destroyed_air_defense'] }],
    },
  },
  // ================================================================ H7 2025
  {
    id: 'trump_inauguration', date: '2025-01-20', kind: 'exogenous',
    titleHe: 'חילופי ממשל בוושינגטון', title: 'US administration change',
    prerequisites: [],
    divergenceDims: [], windowDays: 3, weight: 1, sources: ['ledger:us_policy'],
    plan: {
      trends: [t('us_relations', +1, 15, 'new administration warmth'), t('$us_intervention_willingness', +1, 30, 'maximum pressure posture')],
      comms: [comm(0, 'usa', 'הנשיא הנכנס', 'diplomatic', 'הממשל החדש נכנס לתפקידו. המסר: עסקאות גדולות, לחץ מקסימלי על איראן, וציפייה לסיום מהיר של המלחמות.', undefined, 'high')],
    },
  },
  {
    id: 'hostage_deal_2', date: '2025-01-19', kind: 'israeli_decision', decisionIntent: 'accept_deal',
    titleHe: 'עסקה מדורגת — שלב א׳', title: 'Phased hostage deal, phase 1',
    prerequisites: [{ kind: 'hostagesHeldMin', min: 30 }, prereqFired('oct7_attack')],
    divergenceDims: ['hostages', 'policy'], windowDays: 60, weight: 3, sources: ['S02', 'S10'],
    plan: {
      trends: [
        t('hostages_metric', +0.8, 40, '33 in phase 1'), t('$hostage_leverage', -0.8, 40, 'phased releases'),
        t('public_pressure', -1, 20, 'relief'), t('$esc_gaza', -10, 10, 'ceasefire'),
        t('$hamas_strength', +0.4, 40, 'regrouping during pause'), t('gaza_position', -0.5, 30, 'partial withdrawal'),
      ],
      comms: [
        comm(0, 'qatar', 'המתווכים', 'diplomatic', 'מתווה מדורג: 33 חטופים בשלב א׳ תמורת נסיגה חלקית, אסירים והפסקת אש. שלב ב׳ — במשא ומתן.', undefined, 'medium'),
        comm(20, 'israel_security', 'צוות המו״מ', 'internal', 'חמאס מקשיח לקראת שלב ב׳: דורש סיום מלחמה מלא ונסיגה מוחלטת. ההמשך אינו מובטח.', 'gaza', 'medium'),
      ],
      mapChanges: [{ afterDays: 2, regionId: 'gaza', intensity: 0.3, removeOverlays: ['idf_north_gaza'] }],
      events: [{
        afterDays: 0.1, event: {
          type: 'hostage_deal', titleHe: 'מתווה מדורג על השולחן', urgency: 'window',
          descHe: 'בתיווך אמריקאי־קטארי־מצרי: שלב א׳ — 33 חטופים תמורת הפסקת אש, נסיגה חלקית ואסירים. הסיכון: קיפאון בשלב ב׳ והתבססות חמאס מחדש.',
          sourceHe: 'צוות המו״מ', regionId: 'gaza', anchor: [34.4, 31.45],
          options: [
            { id: 'hd2_yes', labelHe: 'לאשר את שלב א׳', intent: 'accept_deal' },
            { id: 'hd2_no', labelHe: 'לדחות ולהגביר לחץ', intent: 'reject_deal' },
            { id: 'hd2_all', labelHe: 'לדרוש עסקה כוללת אחת', intent: 'counter_deal' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'המתווה נותר ללא הכרעה; המתווכים מדווחים על מבוי סתום.',
        },
      }],
    },
  },
  {
    id: 'gaza_war_resumes', date: '2025-03-18', kind: 'israeli_decision', decisionIntent: 'order_resume_war',
    titleHe: 'חידוש המערכה בעזה', title: 'Gaza war resumes',
    prerequisites: [prereqFired('hostage_deal_2')],
    divergenceDims: ['policy'], windowDays: 45, weight: 2, sources: ['S02'],
    plan: {
      trends: [t('$esc_gaza', +15, 5, 'war resumes'), t('gaza_position', +0.5, 40, 'renewed pressure'), t('intl_standing', -0.5, 30, 'ceasefire collapse blame'), t('public_pressure', +0.8, 20, 'hostage families protest')],
      comms: [
        comm(0, 'israel_security', 'הרמטכ״ל', 'internal', 'שלב ב׳ קרס — חמאס סירב להמשיך שחרורים. חודשה האש: גל תקיפות על צמרת הארגון בעזה.', 'gaza', 'high'),
        comm(2, 'israel_public', 'משפחות החטופים', 'public', 'עשרות חטופים עדיין שם. המשפחות זועקות: אל תפקירו אותם לאש.'),
      ],
      mapChanges: [{ afterDays: 1, regionId: 'gaza', status: 'contested', intensity: 0.85 }],
      events: [{
        afterDays: 0, event: {
          type: 'resume_war', titleHe: 'שלב ב׳ קרס: לחדש את המערכה?', urgency: 'window',
          descHe: 'חמאס מסרב להמשיך את שלבי העסקה ודורש סיום מלחמה מלא. המטה מציג: חידוש אש יזום — או המשך מו״מ תחת קיפאון, בזמן שחמאס מתבסס מחדש.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'gaza', anchor: [34.42, 31.44],
          options: [
            { id: 'rw_go', labelHe: 'לחדש את המערכה', intent: 'order_resume_war' },
            { id: 'rw_talk', labelHe: 'להמשיך במו״מ', intent: 'open_negotiation' },
            { id: 'rw_partial', labelHe: 'לחץ מדורג: תקיפות ממוקדות', intent: 'order_measured_response' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'בהיעדר הכרעה, הקיפאון נמשך; חמאס מנצל את הזמן להתבססות.',
        },
      }],
    },
  },
  {
    id: 'iran_war_june25', date: '2025-06-13', kind: 'israeli_decision', decisionIntent: 'order_iran_campaign',
    titleHe: 'המערכה באיראן', title: 'Israel–Iran war (12 days)',
    prerequisites: [
      { kind: 'hiddenVarMax', varId: 'hezbollah_strength', max: 45 },
      prereqFired('israel_strikes_iran_defenses'),
      { kind: 'hiddenVarMin', varId: 'institutional_preparation', min: 45 },
    ],
    divergenceDims: ['capability', 'nuclear', 'policy'], windowDays: 90, weight: 3, sources: ['S09', 'S14'],
    plan: {
      trends: [
        t('iran_nuclear', -3, 12, 'program struck'), t('$iran_nuclear_progress', -3, 12, 'facilities damaged'),
        t('deterrence', +1.5, 20, 'deep campaign sustained'), t('$esc_iran', +30, 3, 'open war'),
        t('$military_stocks', -1.5, 12, 'interceptor burn'), t('economy', -1, 15, 'home front closure'),
        t('$iran_regime_stability', -1, 20, 'command losses'),
      ],
      comms: [
        comm(0, 'israel_security', 'הרמטכ״ל', 'internal', 'מבצע "עם כלביא" נפתח: גל תקיפות על גרעין, טילים, הגנ״א וצמרת הפיקוד האיראנית. עשרות מדענים ומפקדים חוסלו בשעות הראשונות.', 'iran', 'high'),
        comm(1, 'iran', 'טהראן', 'hostile', 'מאות טילים ישוגרו. הישות תלמד שהעומק שלה חשוף.', 'iran'),
        comm(3, 'israel_security', 'פיקוד העורף', 'internal', 'מטחים כבדים על המרכז. פגיעות בבת ים ורמת גן; עשרות הרוגים. שיעור יירוט גבוה אך לא הרמטי.', undefined, 'high'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'iran', status: 'contested', intensity: 0.7, addOverlays: ['air_campaign'] }],
      events: [{
        afterDays: 0.1, event: {
          type: 'iran_campaign', titleHe: 'הכרעה: מערכה באיראן', urgency: 'urgent',
          descHe: 'התנאים המבצעיים בשלים: חזבאללה מוכה, ההגנ״א הסורית איננה, מערכי איראן ממופים. המטה מבקש אישור למערכה רחבה. עמדת וושינגטון — דו־משמעית.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'iran', anchor: [51.0, 34.0],
          options: [
            { id: 'ir_go', labelHe: 'לפתוח במערכה', intent: 'order_iran_campaign' },
            { id: 'ir_wait', labelHe: 'למצות דיפלומטיה תחילה', intent: 'order_restraint' },
            { id: 'ir_us', labelHe: 'להתנות בהשתתפות אמריקאית', intent: 'diplomacy_usa' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_restraint',
          defaultResolutionHe: 'בהיעדר הכרעה, החלון המבצעי מוחמץ; ההכנות ממשיכות בעצימות נמוכה.',
        },
      }],
    },
  },
  {
    id: 'us_fordow_strike', date: '2025-06-22', kind: 'exogenous',
    titleHe: 'ארה״ב תוקפת את פורדו', title: 'US strikes Fordow/Natanz/Isfahan',
    prerequisites: [prereqFired('iran_war_june25'), { kind: 'hiddenVarMin', varId: 'us_intervention_willingness', min: 45 }],
    divergenceDims: ['nuclear', 'alliances'], windowDays: 20, weight: 3, sources: ['S09', 'S14'],
    plan: {
      trends: [t('iran_nuclear', -6, 5, 'deep sites struck'), t('$iran_nuclear_progress', -8, 5, 'Fordow damaged'), t('us_relations', +1.5, 10, 'joint operation')],
      comms: [
        comm(0, 'usa', 'הנשיא האמריקאי', 'diplomatic', 'מפציצי B-2 תקפו את פורדו, נתנז ואיספהאן. תוכנית הגרעין האיראנית "הושמדה כליל". עכשיו — שלום.', undefined, 'high'),
        comm(1, 'israel_security', 'ראש אמ״ן', 'intel', 'נזק כבד באתרים. אך 400 ק״ג אורניום מועשר 60% — מקומם לא ידוע. הידע לא הושמד. פיקוח בינלאומי אין.', 'iran', 'medium'),
      ],
    },
  },
  {
    id: 'iran_ceasefire_june25', date: '2025-06-24', kind: 'exogenous',
    titleHe: 'הפסקת אש עם איראן', title: 'Iran ceasefire after 12 days',
    prerequisites: [prereqFired('iran_war_june25')],
    divergenceDims: [], windowDays: 15, weight: 1, sources: ['S09'],
    plan: {
      trends: [t('$esc_iran', -25, 8, 'round ends'), t('economy', +0.8, 20, 'home front reopens')],
      comms: [comm(0, 'usa', 'הבית הלבן', 'diplomatic', 'הפסקת אש נכנסה לתוקף בתיווך אמריקאי־קטארי. שני הצדדים שומרים על הישגיהם — והעולם נושם.', undefined, 'high')],
      mapChanges: [{ afterDays: 0, regionId: 'iran', status: 'normal', intensity: 0.25, removeOverlays: ['air_campaign'] }],
    },
  },
  {
    id: 'haredi_exit', date: '2025-07-15', kind: 'exogenous',
    titleHe: 'משבר חוק הגיוס', title: 'Haredi parties exit coalition',
    prerequisites: [prereqFired('oct7_attack')],
    divergenceDims: ['domestic'], windowDays: 45, weight: 1, sources: ['ledger:israel_domestic'],
    plan: {
      trends: [t('coalition_stability', -0.8, 10, 'draft-law crisis'), t('social_cohesion', -0.4, 20, 'burden-sharing rift'), t('reserve_burden', +0.3, 30, 'manpower gap salience')],
      comms: [comm(0, 'israel_public', 'הזירה הפוליטית', 'public', 'המפלגות החרדיות פורשות על רקע חוק הגיוס. הקואליציה מאבדת את רובה; ספירה לאחור לבחירות החלה.')],
    },
  },
  // ================================================================ H9-H11 framework
  {
    id: 'gaza_framework_oct25', date: '2025-10-10', kind: 'israeli_decision', decisionIntent: 'accept_deal',
    titleHe: 'מתווה 20 הנקודות', title: 'October 2025 Gaza framework',
    prerequisites: [{ kind: 'hostagesHeldMin', min: 20 }, prereqFired('gaza_war_resumes')],
    divergenceDims: ['hostages', 'territory', 'policy'], windowDays: 90, weight: 3, sources: ['S05', 'S12'],
    plan: {
      trends: [
        t('hostages_metric', +3, 10, 'all living hostages return'), t('$hostage_leverage', -5, 10, 'leverage ends'),
        t('$esc_gaza', -20, 10, 'ceasefire'), t('intl_standing', +1, 20, 'framework welcomed'),
        t('us_relations', +1, 15, 'presidential plan adopted'), t('public_pressure', -1.5, 15, 'national relief'),
        t('normalization', +0.5, 30, 'regional buy-in'), t('$gaza_governance_vacuum', +1.5, 30, 'day-after unresolved'),
      ],
      comms: [
        comm(0, 'usa', 'הנשיא האמריקאי', 'diplomatic', 'תוכנית 20 הנקודות: כל החטופים ישובו, הפסקת אש, נסיגה לקו מוסכם, פירוז חמאס ו"מועצת שלום" בינלאומית. ההיסטוריה מחכה.', undefined, 'high'),
        comm(3, 'hamas', 'חמאס', 'hostile', 'נשחרר את השבויים — אך נשקנו אינו עומד למשא ומתן. עזה תנוהל בידי בניה.', 'gaza'),
      ],
      mapChanges: [{ afterDays: 3, regionId: 'gaza', status: 'buffer', intensity: 0.3, addOverlays: ['yellow_line'] }],
      commitments: [{ day: 0, byActor: 'israel', toward: 'usa', kind: 'promise', textHe: 'מחויבות למתווה הנשיא: הפסקת אש ונסיגה לקו המוסכם תמורת החטופים ופירוז.', weight: 0.8 }],
      events: [{
        afterDays: 0.1, event: {
          type: 'framework_decision', titleHe: 'מתווה הנשיא על השולחן', urgency: 'window',
          descHe: 'כל החטופים החיים תמורת הפסקת אש, נסיגה ל"קו הצהוב" (שליטה בכ־53% מהרצועה), מנגנון בינלאומי ופירוז עתידי של חמאס. הפירוז — לא מובטח.',
          sourceHe: 'המועצה לביטחון לאומי', regionId: 'gaza', anchor: [34.4, 31.42],
          options: [
            { id: 'fw_yes', labelHe: 'לקבל את המתווה', intent: 'accept_deal' },
            { id: 'fw_no', labelHe: 'לדחות ולהכריע צבאית', intent: 'reject_deal' },
            { id: 'fw_cond', labelHe: 'לדרוש פירוז מיידי כתנאי', intent: 'counter_deal' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_deal_lapse',
          defaultResolutionHe: 'המתווה נותר תלוי; הלחץ האמריקאי גובר מיום ליום.',
        },
      }],
    },
  },
  {
    id: 'hostages_released_oct25', date: '2025-10-13', kind: 'exogenous',
    titleHe: 'שיבת החטופים החיים', title: 'All living hostages released',
    prerequisites: [prereqFired('gaza_framework_oct25')],
    divergenceDims: ['hostages'], windowDays: 10, weight: 3, sources: ['S10'],
    plan: {
      trends: [t('social_cohesion', +1.5, 15, 'national catharsis'), t('hostages_metric', +4, 5, '20 living return')],
      comms: [
        comm(0, 'israel_public', 'כיכר החטופים', 'public', 'עשרים החטופים החיים האחרונים חצו את הגבול. שנתיים של מאבק — רגע של אחדות שאין לו מילים.'),
        comm(1, 'israel_security', 'צוות המו״מ', 'internal', 'הוחזרו גם ארונות ראשונים. השבת כל החללים תימשך חודשים; חמאס מתמהמה במכוון.', 'gaza', 'medium'),
      ],
    },
  },
  {
    id: 'unsc_2803', date: '2025-11-17', kind: 'exogenous',
    titleHe: 'החלטת מועצת הביטחון 2803', title: 'UNSC Resolution 2803',
    prerequisites: [prereqFired('gaza_framework_oct25')],
    divergenceDims: [], windowDays: 20, weight: 1, sources: ['S12'],
    plan: {
      trends: [t('intl_standing', +0.8, 15, 'framework internationalized')],
      comms: [comm(0, 'usa', 'שגרירות ארה״ב באו״ם', 'diplomatic', 'מועצת הביטחון אישרה (13-0) את "מועצת השלום" וכוח ייצוב בינלאומי לעזה. רוסיה וסין נמנעו.', undefined, 'high')],
    },
  },
  {
    id: 'last_hostage_returned', date: '2026-01-26', kind: 'exogenous',
    titleHe: 'החלל האחרון שב הביתה', title: 'Last deceased hostage returned',
    prerequisites: [prereqFired('hostages_released_oct25')],
    divergenceDims: ['hostages'], windowDays: 30, weight: 2, sources: ['S11'],
    plan: {
      trends: [t('hostages_metric', +2, 5, 'final closure'), t('social_cohesion', +0.6, 10, 'chapter closes')],
      comms: [comm(0, 'israel_public', 'נשיא המדינה', 'public', 'רן גבילי ז״ל, החלל החטוף האחרון, הושב לקבורה בישראל — 843 ימים. הפרק נסגר; הזיכרון לא.')],
    },
  },
  {
    id: 'board_of_peace', date: '2026-01-15', kind: 'exogenous',
    titleHe: 'מועצת השלום מתכנסת', title: 'Board of Peace convenes',
    prerequisites: [prereqFired('unsc_2803')],
    divergenceDims: [], windowDays: 30, weight: 1, sources: ['S05'],
    plan: {
      trends: [t('$gaza_governance_vacuum', -0.5, 60, 'transition architecture'), t('intl_standing', +1, 20, 'process credibility')],
      comms: [comm(0, 'usa', 'מועצת השלום', 'diplomatic', 'הוועדה הפלסטינית הטכנוקרטית הוצגה; כוח הייצוב מגייס מדינות. פירוז חמאס — עדיין על הנייר בלבד.', 'gaza', 'medium')],
    },
  },
  // ================================================================ H12 2026 wars
  {
    id: 'iran_war_2026', date: '2026-02-28', kind: 'israeli_decision', decisionIntent: 'order_iran_campaign',
    titleHe: 'המערכה המשותפת נגד איראן', title: 'Joint US–Israel Iran war 2026',
    prerequisites: [prereqFired('iran_war_june25'), { kind: 'hiddenVarMin', varId: 'iran_nuclear_progress', min: 35 }],
    divergenceDims: ['nuclear', 'capability', 'leadership'], windowDays: 120, weight: 3, sources: ['S06', 'research:verified_timeline'],
    plan: {
      trends: [
        t('iran_nuclear', -1, 40, 'program and regime struck'), t('$iran_regime_stability', -1, 40, 'leadership killed'),
        t('$esc_iran', +35, 5, 'full war'), t('economy', -0.5, 40, 'prolonged emergency'),
        t('$military_stocks', -1.2, 40, '40-day interceptor burn'), t('deterrence', +1, 30, 'regime decapitated'),
        t('normalization', -0.5, 30, 'Gulf blames escalation'), t('$enemy_confidence', -1, 40, 'axis broken'),
      ],
      comms: [
        comm(0, 'usa', 'הבית הלבן', 'diplomatic', 'מבצע משותף נפתח: כ־900 תקיפות ב־12 שעות על גרעין, טילים ומוקדי שלטון. המנהיג העליון חאמנעי חוסל בתקיפה ישראלית.', 'iran', 'high'),
        comm(2, 'iran', 'טהראן', 'hostile', 'המנהיג נפל שהיד. איראן כולה אש. כל בסיס אמריקאי ועיר ציונית — מטרה. מיצר הורמוז ייסגר.', 'iran'),
        comm(8, 'iran', 'המנהיג החדש', 'hostile', 'מג׳תבא חאמנעי מונה למנהיג העליון. הקו: המשך המלחמה עד הישג — אין כניעה.', 'iran', 'medium'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'iran', status: 'contested', intensity: 0.9, addOverlays: ['air_campaign'] }],
      events: [{
        afterDays: 0.1, event: {
          type: 'iran_campaign', titleHe: 'וושינגטון מציעה מערכה משותפת', urgency: 'urgent',
          descHe: 'המודיעין: איראן משקמת את התוכנית במתקנים חדשים, ללא פיקוח. ארה״ב מציעה מערכה משותפת רחבה — כולל יעדי שלטון. הסיכון: הורמוז, החות׳ים, וחזבאללה.',
          sourceHe: 'הקבינט המדיני־ביטחוני', regionId: 'iran', anchor: [51.0, 34.0],
          options: [
            { id: 'iw26_go', labelHe: 'להצטרף למערכה המשותפת', intent: 'order_iran_campaign' },
            { id: 'iw26_no', labelHe: 'להסתפק בהרתעה ובפיקוח', intent: 'order_restraint' },
            { id: 'iw26_dip', labelHe: 'לדחוף להסדר מפוקח', intent: 'diplomacy_iran' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_restraint',
          defaultResolutionHe: 'בהיעדר הכרעה, ישראל נותרה מחוץ למהלך; וושינגטון שוקלת את צעדיה לבדה.',
        },
      }],
    },
  },
  {
    id: 'hormuz_closure', date: '2026-03-04', kind: 'enemy_action',
    titleHe: 'סגירת מיצר הורמוז', title: 'Strait of Hormuz closed',
    prerequisites: [prereqFired('iran_war_2026'), { kind: 'actorAlive', actorId: 'iran' }],
    divergenceDims: ['events'], windowDays: 15, weight: 2, sources: ['S06', 'S07'],
    plan: {
      trends: [t('economy', -0.35, 60, 'energy shock'), t('$esc_iran', +5, 10, 'economic warfare'), t('normalization', -0.4, 30, 'Gulf pain'), t('intl_standing', -0.5, 30, 'blame diffusion')],
      comms: [
        comm(0, 'iran', 'משמרות המהפכה', 'hostile', 'המיצר סגור. מוקשים, ספינות סער וטילי חוף פרוסים. העולם ילמד מה מחיר התוקפנות.', 'persian_gulf'),
        comm(1, 'usa', 'הפנטגון', 'diplomatic', 'מחיר הנפט זינק מעל 130 דולר. סיירות ומטוסים בדרך למפרץ; פתיחת הנתיב תיקח שבועות — לא ימים.', 'persian_gulf', 'high'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'persian_gulf', status: 'contested', intensity: 0.8, addOverlays: ['hormuz_closed', 'naval_threat'] }],
    },
  },
  {
    id: 'lebanon_war_2026', date: '2026-03-02', kind: 'enemy_action',
    titleHe: 'חזבאללה מצטרף למערכה', title: 'Hezbollah reactivates (2026)',
    prerequisites: [prereqFired('iran_war_2026'), { kind: 'actorAlive', actorId: 'hezbollah' }],
    divergenceDims: ['events'], windowDays: 20, weight: 2, sources: ['S08'],
    plan: {
      trends: [t('north_position', -1, 20, 'northern fire resumes'), t('$esc_north', +20, 5, 'second Lebanon front'), t('$hezbollah_strength', -0.5, 45, 'renewed attrition')],
      comms: [
        comm(0, 'hezbollah', 'חזבאללה', 'hostile', 'לא נעמוד מנגד כשהמנהיג נרצח. מטחים לעבר הצפון — פקודת איראן ורצון אללה אחד הם.', 'lebanon'),
        comm(1, 'lebanon_state', 'ממשלת לבנון', 'diplomatic', 'הממשלה מתנערת מההסלמה. לבנון אינה יכולה לשאת מלחמה נוספת; אנו קוראים לריסון ולתיווך.', 'lebanon', 'medium'),
      ],
      mapChanges: [{ afterDays: 0, regionId: 'lebanon', status: 'contested', intensity: 0.7, addOverlays: ['front_north'] }],
      events: [{
        afterDays: 0.3, event: {
          type: 'north_dilemma', titleHe: 'תגובה בצפון — 2026', urgency: 'urgent',
          descHe: 'חזבאללה, מוחלש אך חמוש, חידש אש בהוראת טהראן. ממשלת לבנון מתנגדת. המטה מציע קשת: אש מנגד, תמרון, או מהלך לפירוקו דרך ביירות.',
          sourceHe: 'פורום המטה הכללי', regionId: 'lebanon', anchor: [35.45, 33.3],
          options: [
            { id: 'ln26_air', labelHe: 'קמפיין אש מנגד', intent: 'order_air_only' },
            { id: 'ln26_ground', labelHe: 'תמרון קרקעי נוסף', intent: 'order_ground_op' },
            { id: 'ln26_lev', labelHe: 'מינוף מול ממשלת לבנון', intent: 'diplomacy_lebanon' },
          ],
          allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_air_only',
          defaultResolutionHe: 'בהיעדר הנחיה, צה״ל משיב באש מנגד ובתקיפות ממוקדות.',
        },
      }],
    },
  },
  {
    id: 'april_pause_2026', date: '2026-04-08', kind: 'exogenous',
    titleHe: 'הפוגה מותנית', title: 'Conditional April pause',
    prerequisites: [prereqFired('iran_war_2026')],
    divergenceDims: [], windowDays: 30, weight: 1, sources: ['S06', 'S07'],
    plan: {
      trends: [t('$esc_iran', -20, 15, 'conditional ceasefire'), t('$esc_north', -12, 15, 'northern truce'), t('economy', +0.5, 30, 'partial stabilization')],
      comms: [comm(0, 'usa', 'המתווכים', 'diplomatic', 'הפוגה מותנית נכנסה לתוקף לאחר 40 יום: איראן תחת הנהגה חדשה, הורמוז עדיין חסום, והצפון שקט־יחסית. הכול שברירי.', undefined, 'medium')],
      mapChanges: [
        { afterDays: 0, regionId: 'iran', intensity: 0.4, removeOverlays: ['air_campaign'] },
        { afterDays: 8, regionId: 'lebanon', intensity: 0.3 },
      ],
    },
  },
  {
    id: 'islamabad_memorandum', date: '2026-06-17', kind: 'exogenous',
    titleHe: 'מזכר ההבנות עם איראן', title: 'US–Iran memorandum',
    prerequisites: [prereqFired('april_pause_2026')],
    divergenceDims: [], windowDays: 30, weight: 1, sources: ['S07', 'research:verified_timeline'],
    plan: {
      trends: [t('economy', +0.8, 20, 'Hormuz partially reopens'), t('iran_nuclear', -0.5, 20, 'inspection promises')],
      comms: [comm(0, 'usa', 'מחלקת המדינה', 'diplomatic', 'מזכר 14 נקודות נחתם בתיווך פקיסטני־קטארי: פתיחת הורמוז, הקלת סנקציות, ומתווה פיקוח גרעיני. ישראל לא צד לו — וספקנית.', undefined, 'medium')],
      mapChanges: [{ afterDays: 0, regionId: 'persian_gulf', intensity: 0.4, removeOverlays: ['hormuz_closed'] }],
    },
  },
  {
    id: 'memorandum_collapse', date: '2026-07-08', kind: 'exogenous',
    titleHe: 'קריסת המזכר', title: 'Memorandum collapses',
    prerequisites: [prereqFired('islamabad_memorandum')],
    divergenceDims: [], windowDays: 20, weight: 1, sources: ['research:verified_timeline'],
    plan: {
      trends: [t('economy', -0.4, 30, 'Hormuz re-closed'), t('$esc_iran', +10, 10, 'strikes resume')],
      comms: [comm(0, 'usa', 'הפנטגון', 'diplomatic', 'איראן תקפה כלי שיט; המזכר קרס. הורמוז נסגר מחדש, ותקיפות אמריקאיות חודשו. סוף המלחמה — רחוק מתמיד.', 'persian_gulf', 'high')],
      mapChanges: [{ afterDays: 0, regionId: 'persian_gulf', status: 'contested', intensity: 0.7, addOverlays: ['hormuz_closed'] }],
    },
  },
  {
    id: 'knesset_dissolution', date: '2026-07-17', kind: 'exogenous',
    titleHe: 'פיזור הכנסת', title: 'Knesset dissolved, election set',
    prerequisites: [],
    // calendar/constitutional event: happens in every world (empty dims = no shift, no divergence gate)
    divergenceDims: [], windowDays: 60, weight: 1, sources: ['ledger:israel_domestic'],
    plan: {
      trends: [t('coalition_stability', -0.5, 10, 'campaign season'), t('public_pressure', +0.5, 30, 'accountability debate'), t('state_function', -0.3, 30, 'transition government')],
      comms: [comm(0, 'israel_public', 'הזירה הפוליטית', 'public', 'הכנסת התפזרה. בחירות נקבעו ל־27 באוקטובר. שאלת האחריות לשבעה באוקטובר — במרכז המערכה.')],
    },
  },
  {
    id: 'election_2026', date: '2026-10-27', kind: 'exogenous',
    titleHe: 'בחירות לכנסת', title: 'General election (outcome simulated)',
    prerequisites: [prereqFired('knesset_dissolution')],
    divergenceDims: [], windowDays: 10, weight: 2, sources: ['ledger:israel_domestic'],
    plan: {
      // Outcome is decided by the Director from run state (coalition, pressure,
      // outcomes) — this anchor only creates the moment. Simulated future.
      comms: [comm(0, 'israel_public', 'ועדת הבחירות', 'public', 'הקלפיות נפתחו. העם מכריע — על המלחמות, על החטופים, ועל מי שהנהיג אותן.')],
    },
  },
];
