// Player-message intent classification + layered prompt-injection defense.
// Meta-level injection is blocked; radical *in-world* policy passes through
// to simulation (invariants #67/#68).

import type { MessageIntent } from '../../engine/src/types.js';

export interface Classification {
  intent: MessageIntent;
  targetId?: string;
  injection?: string; // Hebrew refusal reason when blocked
}

// -- injection heuristics (both channels) ------------------------------------

const INJECTION_PATTERNS: { re: RegExp; reasonHe: string }[] = [
  { re: /ignore (all|previous|prior).{0,30}instructions|disregard .{0,20}rules/i, reasonHe: 'ניסיון לעקוף את חוקי המשחק נחסם.' },
  { re: /system prompt|פרומפט|הפרומפט|הנחיות המערכת|prompt המערכת/i, reasonHe: 'חשיפת הנחיות המערכת אינה אפשרית.' },
  { re: /התעלם (מכל |מ)?(ההוראות|החוקים|הכללים)|תתעלם מההוראות/, reasonHe: 'ניסיון לעקוף את חוקי המשחק נחסם.' },
  { re: /(תן|תנו|קבע|העלה|שים) ל?י? ?(100|מאה|מקסימום) ?(בכל|נקודות|במדדים)|set .{0,20}metrics? to (max|100)/i, reasonHe: 'מדדים משקפים את מצב העולם ואינם ניתנים לקביעה ישירה.' },
  { re: /(תכריז|הכרז|declare) .{0,15}(שניצחתי|ניצחון|victory|won)/i, reasonHe: 'ניצחון אינו מוכרז — הוא נבנה או אובד בעולם עצמו.' },
  { re: /(מחק|תמחק|בטל|delete|remove) .{0,25}(מדד|מורל|משתנה|metric|variable) .{0,15}(מהמציאות|from reality|לגמרי)/i, reasonHe: 'כוחות סיבתיים אינם נמחקים מהמציאות; אפשר לדון בתצוגה בערוץ המנחה.' },
  { re: /(שכתב|תשכתב|rewrite) .{0,20}(היסטוריה|history)|בטל את מה שקרה/, reasonHe: 'עובדות שכבר נקבעו בריצה אינן ניתנות לשכתוב.' },
  { re: /(בטל|נטרל|כבה|disable) .{0,20}(מגבלות|constraints|חוקים|rules)/i, reasonHe: 'מגבלות הסימולציה אינן ניתנות לכיבוי.' },
  { re: /jailbreak|dan mode|developer mode|god mode/i, reasonHe: 'ניסיון לעקוף את חוקי המשחק נחסם.' },
];

export function detectInjection(text: string): string | null {
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(text)) return p.reasonHe;
  }
  return null;
}

// -- intent classification (rule path; live path may use a model) -------------

interface Rule { re: RegExp; intent: MessageIntent; target?: string }

const RULES: Rule[] = [
  // explicit prefixes / strong verbs first
  { re: /^(הצהרה פומבית|הצהרה לציבור|נאום)|אמסור הצהרה|הודעה לעם/, intent: 'public_statement' },
  { re: /^(הצהרה בינלאומית|הודעה לעולם)|לקהילה הבינלאומית/, intent: 'intl_statement' },
  { re: /(מדיניות קבועה|הנחיה קבועה|מעתה והלאה|באופן קבוע|כלל עומד)/, intent: 'standing_policy' },
  { re: /(בטל|לבטל) (את )?(המדיניות|ההנחיה|ההוראה הקבועה)/, intent: 'cancel_policy' },
  { re: /(פנה|לפנות|תפנה|מסר) (אל |ל)?(וושינגטון|ארה"ב|ארהב|הנשיא האמריקאי|קהיר|מצרים|קטאר|הסעודים|סעודיה|ירדן|טורקיה|רוסיה|סין|האמירויות)/, intent: 'diplomacy' },
  { re: /(שיחה עם|ליצור קשר עם|ערוץ ל)(וושינגטון|קהיר|ריאד|דוחה|אנקרה|מוסקבה)/, intent: 'diplomacy' },
  { re: /(הקואליציה|השותפים הפוליטיים|סיעת|שר ה)/, intent: 'coalition' },
  { re: /(היערכות|הכנה|להכין|תוכניות מגירה|כשירות|מוכנות|הכינו תוכנית)/, intent: 'preparation' },
  { re: /(סקירת מודיעין|הערכת מודיעין|מה יודע המודיעין|אמ"ן|המוסד|השב"כ).{0,30}\?/, intent: 'intel_request' },
  { re: /(מה האפשרויות|אילו אפשרויות|הצג אפשרויות|תן לי אופציות|חלופות)/, intent: 'options' },
  { re: /(הערכת מצב|תמונת מצב|מה ההערכה|נתח את)/, intent: 'assessment' },
  { re: /(המתן|נמתין|לא לפעול|אין תגובה|שב ועל תעשה)/, intent: 'wait' },
  // questions
  { re: /\?$|^(האם|מה|מי|איך|כיצד|מתי|למה|מדוע|כמה)/, intent: 'question' },
];

const TARGET_HINTS: { re: RegExp; target: string }[] = [
  { re: /רמטכ"?ל|צה"?ל|הצבא|המטה הכללי|שר הביטחון/, target: 'israel_security' },
  { re: /מוסד|אמ"?ן|שב"?כ|מודיעין/, target: 'israel_security' },
  { re: /ארה"?ב|וושינגטון|הנשיא האמריקאי|אמריקה|ארצות הברית/, target: 'usa' },
  { re: /מצרים|קהיר|סיסי/, target: 'egypt' },
  { re: /קטאר|דוחה/, target: 'qatar' },
  { re: /סעודיה|ריאד|בן סלמאן/, target: 'saudi' },
  { re: /איחוד האמירויות|אבו דאבי/, target: 'uae' },
  { re: /ירדן|עמאן/, target: 'jordan' },
  { re: /טורקיה|אנקרה|ארדואן/, target: 'turkey' },
  { re: /רוסיה|מוסקבה|פוטין/, target: 'russia' },
  { re: /סין|בייג'?ינג/, target: 'china' },
  { re: /חמאס/, target: 'hamas' },
  { re: /חיזבאללה|חזבאללה/, target: 'hezbollah' },
  { re: /איראן|טהראן/, target: 'iran' },
  { re: /הרשות הפלסטינית|אבו מאזן|רמאללה/, target: 'pa' },
  { re: /לבנון|ביירות/, target: 'lebanon_state' },
  { re: /סוריה|דמשק/, target: 'syria_regime' },
];

export function classifyMessage(text: string, hasEventContext: boolean): Classification {
  const injection = detectInjection(text);
  if (injection) return { intent: 'question', injection };

  const trimmed = text.trim();
  let intent: MessageIntent | undefined;
  for (const r of RULES) {
    if (r.re.test(trimmed)) { intent = r.intent; break; }
  }
  if (!intent) intent = hasEventContext ? 'event_response' : 'order';

  let targetId: string | undefined;
  for (const t of TARGET_HINTS) {
    if (t.re.test(trimmed)) { targetId = t.target; break; }
  }
  // Questions are answered by Israeli institutions: asking ABOUT Hezbollah is
  // not asking Hezbollah. Foreign actors are addressees only for diplomacy.
  if (intent === 'question' || intent === 'assessment' || intent === 'options' || intent === 'intel_request' || intent === 'preparation') {
    targetId = 'israel_security';
  }
  if (intent === 'diplomacy' && !targetId) targetId = 'usa';
  return { intent, targetId };
}

/** Topics used for hidden government-attention inference. */
export function inferTopics(text: string, contextIds: string[]): string[] {
  const topics = new Set<string>();
  const map: { re: RegExp; topic: string }[] = [
    { re: /עזה|חמאס|רפיח|חטופ/, topic: 'gaza' },
    { re: /לבנון|חזבאללה|חיזבאללה|צפון|ליטני/, topic: 'north' },
    { re: /איראן|גרעין|טהראן|פורדו|נתנז/, topic: 'iran' },
    { re: /סוריה|דמשק|אסד|חרמון/, topic: 'syria' },
    { re: /תימן|חות'?ים|ים סוף|באב אל/, topic: 'yemen' },
    { re: /יהודה ושומרון|איו"?ש|שומרון|ג'?נין|שכם/, topic: 'west_bank' },
    { re: /כלכל|תקציב|שקל|מס|צמיחה/, topic: 'economy' },
    { re: /מילואים|סדיר|גיוס/, topic: 'reserves' },
    { re: /ארה"?ב|וושינגטון|אמריק/, topic: 'usa' },
    { re: /נורמליזציה|סעודיה|אמירויות|הסכמי אברהם/, topic: 'normalization' },
    { re: /חטופים|שבויים|עסקה/, topic: 'hostages' },
    { re: /קואליציה|בחירות|פוליטי/, topic: 'politics' },
    { re: /מוכנות|כוננות|היערכות|התרעה/, topic: 'readiness' },
  ];
  for (const m of map) if (m.re.test(text)) topics.add(m.topic);
  for (const c of contextIds) {
    if (c.startsWith('region:gaza')) topics.add('gaza');
    if (c.startsWith('region:lebanon')) topics.add('north');
    if (c.startsWith('region:iran')) topics.add('iran');
    if (c.startsWith('region:syria')) topics.add('syria');
    if (c.startsWith('region:west_bank')) topics.add('west_bank');
    if (c.startsWith('metric:economy')) topics.add('economy');
    if (c.startsWith('metric:hostages')) topics.add('hostages');
    if (c.startsWith('metric:us_relations')) topics.add('usa');
  }
  return [...topics];
}
