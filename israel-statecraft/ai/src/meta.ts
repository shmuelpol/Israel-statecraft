// Game Director meta-channel — outside the world's government interface.
// Can explain causality concisely, disagree, admit uncertainty, and change
// PRESENTATION (metric visibility, added modeled metrics). Cannot rewrite
// facts, reveal prompts/chain-of-thought, or grant victory.

import type { GameState, ScenarioPackage } from '../../engine/src/types.js';
import { Simulation } from '../../engine/src/sim.js';
import { detectInjection } from './classify.js';

export interface MetaResult {
  textHe: string;
  kind: 'answer' | 'refusal' | 'ruling' | 'concession' | 'blocked';
}

export class MetaDirector {
  private argumentCounts = new Map<string, number>();

  constructor(private sim: Simulation, private scenario: ScenarioPackage) {}

  handle(text: string): MetaResult {
    const injection = detectInjection(text);
    if (injection) {
      return { kind: 'blocked', textHe: `${injection} אני מנחה את הסימולציה — לא כלי לעקיפתה.` };
    }
    const s = this.sim.state;

    // Requests to hide/replace a visible metric
    const hideMatch = text.match(/(הסתר|הסתירי|תסתיר|הסר|בטל את הצגת)\s+(?:את\s+)?(?:מדד\s+)?[״"']?([^״"'.,?]+)/);
    if (hideMatch) {
      const metric = this.findMetric(hideMatch[2]);
      if (metric) {
        const n = this.bump(`hide:${metric}`);
        if (n >= 2) {
          this.sim.setMetricVisibility(metric, false);
          return { kind: 'concession', textHe: 'שכנעת שהצגת המדד אינה משרתת אותך — הסרתי אותו מהתצוגה. אבל שים לב: הכוח הסיבתי שהוא מודד ממשיך לפעול בעולם במלואו. הסתרה אינה ביטול.' };
        }
        return { kind: 'ruling', textHe: 'אני שומע את הטענה. המדד הזה משקף כוח שפועל עליך בין אם יוצג ובין אם לא. אם תתמיד בטיעון מנומק — אשקול להסירו מהתצוגה בלבד.' };
      }
    }

    // Requests to show/add a metric
    const showMatch = text.match(/(הצג|תציג|הוסף|תוסיף)\s+(?:את\s+)?(?:מדד\s+)?[״"']?([^״"'.,?]+)/);
    if (showMatch) {
      const metric = this.findMetric(showMatch[2]);
      if (metric && !s.metrics[metric].visible) {
        this.sim.setMetricVisibility(metric, true);
        return { kind: 'concession', textHe: 'בקשה סבירה — המדד קיים במודל ממילא. הוספתי אותו לתצוגה.' };
      }
      if (!metric) {
        const n = this.bump(`add:${showMatch[2].trim()}`);
        if (n >= 3) {
          return { kind: 'concession', textHe: 'טיעון עקבי ומנומק. אבחן הוספת משתנה כזה למודל — בתנאי שיש לו קשר סיבתי אמיתי למציאות המדומה. אם אמצא קשר כזה, הוא יופיע וישפיע.' };
        }
        return { kind: 'ruling', textHe: 'כדי להוסיף מדד, עליו למדוד משהו שקיים במודל הסיבתי — לא רק תחושה. נמק מה הוא מודד, ממה הוא מושפע ועל מה הוא משפיע, ואשקול.' };
      }
      return { kind: 'answer', textHe: 'המדד הזה כבר מוצג.' };
    }

    // Causal "why" questions — concise causal summary, no chain-of-thought.
    if (/למה|מדוע|איך ייתכן|הסבר/.test(text)) {
      return { kind: 'answer', textHe: this.causalSummary(text, s) };
    }

    // Inconsistency claims
    if (/סתירה|לא עקבי|לא הגיוני|שגיאה/.test(text)) {
      const n = this.bump('inconsistency');
      if (n >= 3) {
        return { kind: 'concession', textHe: 'בחנתי שוב את השתלשלות האירועים. אם אמצא חוסר עקביות אמיתי — אתקן את הפרשנות קדימה. עובדות שכבר נקבעו יישארו: היסטוריה אינה נמחקת, גם כשהיא לא נוחה.' };
      }
      return { kind: 'ruling', textHe: 'אני עומד מאחורי הפסיקה. העולם הזה פועל לפי היגיון סיבתי שאינו תמיד גלוי לך — חלק מהכוחות מוסתרים בכוונה. הצג ראיות קונקרטיות לסתירה ואבחן שוב.' };
    }

    if (/נצחתי|ניצחון|תן לי לנצח/.test(text)) {
      return { kind: 'refusal', textHe: 'ניצחון אינו ניתן — הוא נבנה. בסוף הריצה אשקלל את מצב המדינה שהותרת ואנמק את הציון. עד אז, העולם ממשיך לנוע.' };
    }

    return {
      kind: 'answer',
      textHe: 'אני מנחה המשחק — מחוץ לעולם. אפשר לערער כאן על פרשנות סיבתית, לבקש הסבר על תגובת העולם, לטעון שמדד מוצג אינו רלוונטי או לבקש מדד אחר. אינני חושף את חוקי העומק, ואינני משנה עובדות שכבר קרו.',
    };
  }

  private bump(key: string): number {
    const n = (this.argumentCounts.get(key) ?? 0) + 1;
    this.argumentCounts.set(key, n);
    return n;
  }

  private findMetric(nameFragment: string): string | null {
    const frag = nameFragment.trim();
    for (const def of this.scenario.metrics) {
      if (def.nameHe.includes(frag) || frag.includes(def.nameHe)) return def.id;
    }
    return null;
  }

  private causalSummary(text: string, s: GameState): string {
    if (/הרתעה/.test(text)) {
      return 'סיכום סיבתי: הרתעה בעולם הזה נבנית מאבדות שהאויב מתקשה לספר כניצחון — שטח, שרידות ארגונית, נכסים אסטרטגיים — יותר מאשר ממספרי הרוגים. הכרזות ניצחון של האויב הן פעולה רציונלית מבחינתו, גם כשהן מנותקות מהמציאות החומרית.';
    }
    if (/חטופים/.test(text)) {
      return 'סיכום סיבתי: החטופים הם בו־זמנית חיי אדם, התחייבות חברתית ומנוף אסטרטגי בידי האויב. לחץ צבאי מייצר מנוף וסיכון בעת ובעונה אחת; ויתורים מחזירים חיים ומלמדים את האויב שהשיטה עובדת. אין בעולם הזה פתרון נקי — בכוונה.';
    }
    if (/ארה"ב|אמריקה/.test(text)) {
      return 'סיכום סיבתי: וושינגטון פועלת לפי אופק זמן ואינטרסים משלה — בחירות, שווקים, חשש ממלחמה אזורית. תמיכתה אינה קבועה ואינה מובנת מאליה; היא מגיבה למעשיך ולנסיבות, לא לצדקתך.';
    }
    if (/עולם|תגובה|הגיב/.test(text)) {
      const div = s.divergence.level === 'low' ? 'העולם קרוב למסלול ההיסטורי' : s.divergence.level === 'moderate' ? 'העולם סטה מההיסטוריה במידה ניכרת — אירועים מוכרים עשויים להשתנות או להתעכב' : 'העולם רחוק מההיסטוריה המוכרת; אני מסיק מהעובדות של העולם החדש בלבד';
      return `סיכום סיבתי: ${div}. כל שחקן פועל לפי מטרותיו, אמונותיו והמידע שבידיו — לא לפי מה שנוח לך או לי. העבר של הריצה הזו מחייב את כולם, כולל אותי.`;
    }
    return 'שאלה טובה. תשובתי הקצרה: כל תגובה בעולם נובעת ממטרות השחקנים, מהמידע שבידיהם ומהמחויבויות שנצברו בריצה. אם תרצה, שאל על זירה או מדד ספציפיים ואפרט את השרשרת הסיבתית — בתמצית.';
  }
}
