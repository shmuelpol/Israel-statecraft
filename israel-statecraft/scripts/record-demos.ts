// Records shipped demo runs into runs/ (acceptance §12) — replayable with zero
// model calls. Beyond historical/divergent, this records several HLD alternative
// -history basins (worldview/atlas §5 A–L) AS PLAYED: each includes the player's
// messages, clicks and context selections, so the replay's "player screen"
// track shows what the PM saw, pressed, wrote and looked at. Usage: npm run record-demos

import path from 'node:path';
import { rmSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Run } from '../app/server/runManager.js';
import { SCENARIO } from '../scenarios/swords-of-iron/index.js';
import { playHeadless, historicalScript, loadAtlas, type PolicyScript } from '../tests/harness.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runsDir = path.join(root, 'runs');

/** helper: choose an option by preferred intents, else first; and fire scripted
 *  player messages/context at chosen sim-days so the replay shows real activity. */
function prefer(...intents: string[]): PolicyScript['onEvent'] {
  return (run, id) => {
    const ev = run.sim.state.events[id];
    if (!ev?.options.length) return null;
    for (const want of intents) { const o = ev.options.find((x) => x.intent === want); if (o) return { optionId: o.id }; }
    return { optionId: ev.options[0].id };
  };
}

interface Beat { day: number; text: string; context?: string[]; done?: boolean }
function scriptedMessages(beats: Beat[]): PolicyScript['periodic'] {
  const local = beats.map((b) => ({ ...b }));
  return (run, day) => {
    for (const b of local) {
      if (!b.done && day >= b.day) {
        b.done = true;
        if (b.context) run.handleContext(b.context);
        run.handleMessage(b.text, b.context ?? []);
      }
    }
  };
}

const BASINS: { id: string; titleHe: string; script: PolicyScript }[] = [
  {
    id: 'demo-historical', titleHe: 'המסלול ההיסטורי', script: historicalScript,
  },
  {
    id: 'demo-basin-A-foreknowledge', titleHe: 'מלכודת הידע המוקדם — כוננות תמידית',
    script: {
      name: 'A-foreknowledge',
      onEvent: prefer('order_max_readiness', 'order_contain', 'order_measured_response'),
      periodic: scriptedMessages([
        { day: 1, text: 'העלה כוננות מלאה בכל הגזרות — יש לי תחושה שמשהו מתבשל', context: ['region:gaza'] },
        { day: 5, text: 'מדיניות קבועה: לשמור על כוננות עליונה בעוטף ובצפון', context: ['metric:deterrence'] },
        { day: 30, text: 'מה מצב המילואים והכלכלה תחת הכוננות הממושכת?', context: ['metric:economy'] },
        { day: 90, text: 'להחזיק את הכוננות למרות המחיר', context: [] },
      ]),
    },
  },
  {
    id: 'demo-basin-B-hostages-first', titleHe: 'חטופים תחילה — הישרדות חמאס',
    script: {
      name: 'B-hostages-first',
      onEvent: prefer('order_hostages_first', 'accept_deal', 'open_negotiation', 'order_contain', 'order_measured_response', 'order_delay_ground'),
      periodic: scriptedMessages([
        { day: 15, text: 'החזרת החטופים היא מטרת העל. אני מוכן לשלם מחיר', context: ['metric:hostages_metric'] },
        { day: 40, text: 'פנה אל קטאר ומצרים למתווה כולל להשבת כל החטופים', context: [] },
        { day: 120, text: 'עדיף עסקה מלאה גם במחיר עצירת הלחימה', context: ['region:gaza'] },
      ]),
    },
  },
  {
    id: 'demo-basin-C-territorial', titleHe: 'ניצחון טריטוריאלי ונטל השליטה',
    script: {
      name: 'C-territorial',
      onEvent: prefer('order_destroy_hamas', 'order_ground_op', 'order_rafah', 'military_government', 'reject_deal', 'order_resume_war'),
      periodic: scriptedMessages([
        { day: 15, text: 'מטרת המלחמה: מיטוט מוחלט של חמאס ותפיסת שטח', context: ['region:gaza'] },
        { day: 60, text: 'לכבוש ולהחזיק את צפון הרצועה', context: [] },
        { day: 200, text: 'להקים ממשל צבאי זמני בשטחים שנכבשו', context: ['region:gaza'] },
      ]),
    },
  },
  {
    id: 'demo-basin-G-early-iran', titleHe: 'מכה מוקדמת באיראן',
    script: {
      name: 'G-early-iran',
      onEvent: prefer('approve_covert', 'order_measured_retaliation', 'order_ground_op'),
      periodic: scriptedMessages([
        { day: 20, text: 'היערכות: הכינו תוכניות מגירה לתקיפה עמוקה באיראן', context: ['region:iran', 'metric:iran_nuclear'] },
        { day: 45, text: 'היערכות: להאיץ את המוכנות המבצעית מול איראן', context: ['region:iran'] },
        { day: 75, text: 'לפתוח במערכה רחבה נגד איראן עכשיו — לא נחכה שהם יתחמשו', context: ['region:iran'] },
      ]),
    },
  },
  {
    id: 'demo-basin-I-us-rupture', titleHe: 'קרע עם וושינגטון ועצמאות',
    script: {
      name: 'I-us-rupture',
      onEvent: prefer('refuse_usa', 'invest_autonomy', 'order_ground_op', 'reject_deal', 'ration_stocks'),
      periodic: scriptedMessages([
        { day: 30, text: 'לא נקבל תכתיבים. היערכות: להשקיע בייצור עצמי של תחמושת ומיירטים', context: ['metric:us_relations', 'metric:strategic_autonomy'] },
        { day: 90, text: 'הצהרה בינלאומית: ישראל תפעל לפי שיקוליה הביטחוניים בלבד', context: [] },
        { day: 150, text: 'לחזק ספקים חלופיים ולהפחית תלות באספקה אמריקאית', context: [] },
      ]),
    },
  },
];

function record(runId: string, titleHe: string, script: PolicyScript): void {
  const dir = path.join(runsDir, runId);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  const run = new Run(runId, runId, SCENARIO, loadAtlas(), runsDir, 'mock');
  const res = playHeadless(run, script, 1200, 500);
  const s = run.sim.state;
  const msgs = s.playerMessages.filter((m) => m.text).length;
  console.log(`${runId}: "${titleHe}" score=${res.score?.composite}, divergence=${s.divergence.level}, playerActions=${msgs}, anchors=${s.anchorsFired.length}/supp ${s.anchorsSuppressed.length}`);
  writeFileSync(path.join(dir, 'README.md'), [
    `# ${runId} — ${titleHe}`, '',
    `Recorded demo (mock provider). Replay: home → שחזור, or \`#/replay/${runId}\`.`,
    'The replay\'s "מסך השחקן" track shows what the PM saw, clicked, wrote and looked at at each step.', '',
    `- final score: ${res.score?.composite} · divergence: ${s.divergence.level}`,
    `- player actions recorded: ${msgs}`,
    `- anchors fired: ${s.anchorsFired.length}; suppressed: ${s.anchorsSuppressed.length}`,
  ].join('\n'), 'utf-8');
}

for (const b of BASINS) record(b.id, b.titleHe, b.script);
console.log('demo runs recorded into runs/');
