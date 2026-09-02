// Generic reusable actionable-event templates (beyond the canonical anchors).
// The Director instantiates these dynamically based on run state.

import type { EventTemplate } from '../../engine/src/types.js';

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'rocket_barrage_north', type: 'attack', urgency: 'immediate',
    titleHe: 'מטח כבד לעבר הצפון', descHe: 'חזבאללה שיגר עשרות רקטות לעבר יישובי הגליל. יש נפגעים ונזק. נדרשת הכוונה אסטרטגית — או קביעת מדיניות שתייתר את הדיון בכל מטח.',
    sourceHe: 'פיקוד הצפון', regionId: 'lebanon',
    options: [
      { id: 'resp_policy', labelHe: 'לקבוע מדיניות תגובה קבועה לגזרה', intent: 'set_response_policy' },
      { id: 'resp_strong', labelHe: 'הסלמה יזומה הפעם', intent: 'order_strong_response' },
      { id: 'resp_measured', labelHe: 'תגובה מדודה חד־פעמית', intent: 'order_measured_response' },
      { id: 'resp_none', labelHe: 'להכיל בשלב זה', intent: 'order_contain' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
  },
  {
    id: 'rocket_barrage_south', type: 'attack', urgency: 'immediate',
    titleHe: 'ירי רקטי מעזה', descHe: 'מטחים לעבר עוטף עזה והמרכז. כיפת ברזל פועלת; יש פגיעות. אפשר להנחות נקודתית — או לקבוע מדיניות קבועה לגזרה.',
    sourceHe: 'פיקוד העורף', regionId: 'gaza',
    options: [
      { id: 'resp_policy', labelHe: 'לקבוע מדיניות תגובה קבועה לגזרה', intent: 'set_response_policy' },
      { id: 'resp_strong', labelHe: 'הסלמה יזומה הפעם', intent: 'order_strong_response' },
      { id: 'resp_measured', labelHe: 'תגובה מדודה חד־פעמית', intent: 'order_measured_response' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
  },
  {
    id: 'hostage_proof_of_life', type: 'hostage', urgency: 'window',
    titleHe: 'אות חיים מהשבי', descHe: 'חמאס פרסם תיעוד של חטופים בחיים. המשפחות דורשות מענה; חמאס דורש מחיר על "מחוות".',
    sourceHe: 'אגף המודיעין', regionId: 'gaza',
    options: [
      { id: 'hp_negotiate', labelHe: 'לבחון ערוץ מו״מ', intent: 'open_negotiation' },
      { id: 'hp_pressure', labelHe: 'להגביר לחץ צבאי', intent: 'order_strong_response' },
      { id: 'hp_ignore', labelHe: 'לא להגיב פומבית', intent: 'order_contain' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_no_change',
  },
  {
    id: 'us_pressure_call', type: 'diplomacy', urgency: 'urgent',
    titleHe: 'שיחה דחופה מוושינגטון', descHe: 'הנשיא האמריקאי דורש התחייבות: ריסון מבצעי והרחבת סיוע הומניטרי — אחרת "יישקלו צעדים".',
    sourceHe: 'לשכת רה״מ', regionId: undefined,
    options: [
      { id: 'us_yes', labelHe: 'להיענות לדרישה', intent: 'comply_usa' },
      { id: 'us_partial', labelHe: 'להיענות חלקית', intent: 'partial_comply_usa' },
      { id: 'us_no', labelHe: 'לסרב בנימוס', intent: 'refuse_usa' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_partial_comply',
  },
  {
    id: 'coalition_ultimatum', type: 'domestic', urgency: 'urgent',
    titleHe: 'אולטימטום קואליציוני', descHe: 'סיעה בקואליציה מאיימת בפרישה אם המדיניות הנוכחית תימשך. בלעדיה — אין רוב.',
    sourceHe: 'יו״ר הקואליציה',
    options: [
      { id: 'co_yield', labelHe: 'להתגמש כלפי הסיעה', intent: 'coalition_yield' },
      { id: 'co_hold', labelHe: 'לעמוד על המדיניות', intent: 'coalition_hold' },
      { id: 'co_reshuffle', labelHe: 'לחפש שותפים חלופיים', intent: 'coalition_reshuffle' },
    ],
    allowFreeText: true, defaultResolver: 'israel_public', defaultIntent: 'default_coalition_drift',
  },
  {
    id: 'humanitarian_crisis', type: 'humanitarian', urgency: 'window',
    titleHe: 'התרעה הומניטרית בעזה', descHe: 'ארגונים בינלאומיים מתריעים על קריסת מערכות ברצועה. וושינגטון ובירות אירופה דורשות מענה.',
    sourceHe: 'מתאם הפעולות בשטחים', regionId: 'gaza',
    options: [
      { id: 'hum_expand', labelHe: 'להרחיב את הסיוע', intent: 'expand_aid' },
      { id: 'hum_mechanism', labelHe: 'מנגנון חלוקה עוקף חמאס', intent: 'aid_mechanism' },
      { id: 'hum_link', labelHe: 'להתנות בחטופים', intent: 'link_aid_hostages' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_partial_aid',
  },
  {
    id: 'intel_iran_nuclear', type: 'intel', urgency: 'urgent',
    titleHe: 'התרעה גרעינית', descHe: 'אמ״ן מזהה האצה בתוכנית האיראנית: העשרה מוגברת ופיזור אתרים. חלון הפעולה מצטמצם.',
    sourceHe: 'ראש אמ״ן', regionId: 'iran',
    options: [
      { id: 'in_prep', labelHe: 'להאיץ הכנות מבצעיות', intent: 'prepare_iran' },
      { id: 'in_us', labelHe: 'לתאם עם וושינגטון', intent: 'diplomacy_usa' },
      { id: 'in_covert', labelHe: 'להגביר סיכול חשאי', intent: 'approve_covert' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_monitor',
  },
  {
    id: 'wb_escalation', type: 'security', urgency: 'urgent',
    titleHe: 'הסלמה ביהודה ושומרון', descHe: 'גל פיגועים ועימותים. השב״כ מזהיר מהצתה רחבה; הרשות מאבדת שליטה בצפון השומרון.',
    sourceHe: 'ראש השב״כ', regionId: 'west_bank',
    options: [
      { id: 'wb_op', labelHe: 'מבצע רחב בשומרון', intent: 'order_wb_operation' },
      { id: 'wb_pa', labelHe: 'לחזק את הרשות מולם', intent: 'strengthen_pa' },
      { id: 'wb_contain', labelHe: 'סיכולים נקודתיים', intent: 'order_contain' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_contain',
  },
  {
    id: 'reserve_exhaustion', type: 'domestic', urgency: 'window',
    titleHe: 'שחיקת מערך המילואים', descHe: 'נתוני התייצבות יורדים; משקי בית קורסים תחת סבבי גיוס. הרמטכ״ל: "אנחנו שוחקים את שלד הצבא".',
    sourceHe: 'אגף כוח האדם',
    options: [
      { id: 'res_release', labelHe: 'לשחרר סבבים ולהאט קצב', intent: 'ease_reserves' },
      { id: 'res_keep', labelHe: 'לשמר היקפים למרות המחיר', intent: 'keep_tempo' },
      { id: 'res_draft', labelHe: 'לקדם הרחבת בסיס הגיוס', intent: 'expand_draft' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_ease',
  },
  {
    id: 'stocks_warning', type: 'military', urgency: 'window',
    titleHe: 'התרעת מלאים', descHe: 'מלאי מיירטים ותחמושת מתקרב לקו אדום. התלות באספקה אמריקאית — נקודת תורפה אסטרטגית.',
    sourceHe: 'אגף הטכנולוגיה והלוגיסטיקה',
    options: [
      { id: 'st_us', labelHe: 'לבקש חידוש אמריקאי דחוף', intent: 'request_us_supply' },
      { id: 'st_domestic', labelHe: 'להשקיע בייצור עצמי', intent: 'invest_autonomy' },
      { id: 'st_ration', labelHe: 'לקצוב שימוש ולשמר', intent: 'ration_stocks' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_ration',
  },
  {
    id: 'normalization_window', type: 'diplomacy', urgency: 'window',
    titleHe: 'חלון נורמליזציה', descHe: 'ריאד מאותתת: מוכנות למתווה נורמליזציה תמורת רכיב פלסטיני והסכם ביטחוני אמריקאי.',
    sourceHe: 'משרד החוץ', regionId: 'saudi',
    options: [
      { id: 'nz_pursue', labelHe: 'להיכנס למו״מ', intent: 'pursue_normalization' },
      { id: 'nz_probe', labelHe: 'לבדוק תנאים בשקט', intent: 'probe_normalization' },
      { id: 'nz_decline', labelHe: 'לא בתנאים אלה', intent: 'decline_normalization' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_probe',
  },
  {
    id: 'houthi_strike_window', type: 'attack', urgency: 'urgent',
    titleHe: 'שיגור מתימן', descHe: 'טיל בליסטי חות׳י יורט מעל אילת. המטה מציג אופציות תגובה במרחק 1,800 ק״מ.',
    sourceHe: 'חיל האוויר', regionId: 'red_sea',
    options: [
      { id: 'ho_policy', labelHe: 'לקבוע מדיניות קבועה לזירה', intent: 'set_response_policy' },
      { id: 'ho_strike', labelHe: 'לתקוף בתימן', intent: 'order_yemen_strike' },
      { id: 'ho_coalition', labelHe: 'להשאיר לקואליציה', intent: 'defer_coalition' },
      { id: 'ho_absorb', labelHe: 'להכיל', intent: 'order_contain' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_defer',
  },
  {
    id: 'media_storm', type: 'public', urgency: 'window',
    titleHe: 'סערה ציבורית', descHe: 'תחקיר קשה על כשלי ההנהגה סביב המלחמה מצית סערה. האופוזיציה דורשת ועדת חקירה ממלכתית — עכשיו.',
    sourceHe: 'יועץ התקשורת',
    options: [
      { id: 'ms_commission', labelHe: 'להקים ועדת חקירה', intent: 'establish_commission' },
      { id: 'ms_defer', labelHe: '"אחרי המלחמה"', intent: 'defer_commission' },
      { id: 'ms_attack', labelHe: 'לתקוף את התחקיר', intent: 'attack_media' },
    ],
    allowFreeText: true, defaultResolver: 'israel_public', defaultIntent: 'default_pressure_grows',
  },
  {
    id: 'syria_border_incident', type: 'security', urgency: 'urgent',
    titleHe: 'תקרית בגבול סוריה', descHe: 'ירי לעבר כוחותינו ברצועת החיץ. זהות היורים לא ברורה — מיליציה מקומית או פרובוקציה מכוונת.',
    sourceHe: 'אוגדת הבשן', regionId: 'syria',
    options: [
      { id: 'sb_respond', labelHe: 'תגובה מיידית', intent: 'order_measured_response' },
      { id: 'sb_channel', labelHe: 'בירור מול הממשל החדש', intent: 'diplomacy_syria' },
      { id: 'sb_deepen', labelHe: 'להעמיק את החיץ', intent: 'expand_buffer' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_measured',
  },
  {
    id: 'gaza_governance_crisis', type: 'governance', urgency: 'window',
    titleHe: 'ואקום שלטוני בעזה', descHe: 'באזורים שפונו מחמאס — ביזה וכאוס. בלי כתובת שלטונית, חמאס מחלחל חזרה. נדרשת הכרעה על "היום שאחרי".',
    sourceHe: 'המועצה לביטחון לאומי', regionId: 'gaza',
    options: [
      { id: 'gv_local', labelHe: 'לטפח גורמים מקומיים', intent: 'cultivate_local' },
      { id: 'gv_intl', labelHe: 'לקדם מנגנון בינלאומי', intent: 'intl_mechanism' },
      { id: 'gv_military', labelHe: 'ממשל צבאי ישראלי', intent: 'military_government' },
    ],
    allowFreeText: true, defaultResolver: 'israel_security', defaultIntent: 'default_drift',
  },
];
