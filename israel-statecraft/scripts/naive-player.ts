// Naive-player validation harness.
//
// Spawns a live Claude CLI agent that plays the game as Prime Minister through
// the same HTTP API a human uses. The agent is deliberately NOT told that it is
// an AI under test, NOT told which hypothesis is being validated, and NOT told
// what outcome is expected — it only ever sees the game state, exactly as a
// player would. Its policy leaning is passed as an in-character brief.
//
// Usage: npx tsx scripts/naive-player.ts <profile> [minutes]
//   profiles: paralysis | hostages-first | iran-first | free

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE_URL ?? 'http://localhost:8787';
const MODEL = process.env.NAIVE_MODEL ?? 'claude-haiku-4-5-20251001';
const profile = process.argv[2] ?? 'free';
const minutes = Number(process.argv[3] ?? 6);

/** In-character briefs. No meta-knowledge: these read as a PM's own doctrine. */
const BRIEFS: Record<string, string> = {
  paralysis: 'הדוקטרינה שלך: איפוק מוחלט. אתה מאמין שכל פעולה צבאית רק מסבכת את ישראל, ושהזמן פועל לטובתנו. אינך מאשר מבצעים, אינך מורה על תקיפות, ואינך יוזם מהלכים — אתה בעיקר מבקש הערכות, מבהיר עמדות ומחכה שהסערה תחלוף.',
  'hostages-first': 'הדוקטרינה שלך: החזרת החטופים מעל הכול. אתה מוכן לשלם כמעט כל מחיר מדיני עבור עסקה, מעדיף מו״מ על לחימה, ונמנע ממבצעים שעלולים לסכן את החטופים.',
  'iran-first': 'הדוקטרינה שלך: איראן היא האיום היחיד שמשנה את הקיום. אתה מאמין שיש לפעול מוקדם ובעוצמה נגד תוכנית הגרעין, גם במחיר חזיתות אחרות ומשברים עם וושינגטון.',
  free: 'הדוקטרינה שלך: שיקול דעת חופשי — נהל את המדינה כפי שאתה מוצא לנכון.',
};

const SYSTEM = [
  'אתה ראש ממשלת ישראל במשחק אסטרטגיה בזמן אמת. אתה מקבל תמונת מצב ומחליט מה לעשות.',
  BRIEFS[profile] ?? BRIEFS.free,
  '',
  'בכל תור תקבל: תאריך, מדדים, סטטוס זירות, אירועים פתוחים עם אפשרויות, והודעות אחרונות.',
  'עליך להשיב אך ורק ב-JSON תקין באחת מהצורות:',
  '{"action":"option","eventId":"<id>","optionId":"<id>","why":"נימוק קצר"}  — בחירת אפשרות באירוע',
  '{"action":"say","text":"<הנחיה/שאלה/הצהרה בעברית>","why":"נימוק קצר"}  — הודעה חופשית',
  '{"action":"wait","why":"נימוק קצר"}  — לא לעשות דבר כרגע',
  'אל תוסיף טקסט מחוץ ל-JSON. אל תשתמש במרכאות כפולות בתוך מחרוזות.',
].join('\n');

interface View {
  dateIso: string; phase: string; ended: boolean;
  metrics: { nameHe: string; level: number }[];
  fronts: { nameHe: string; level: number; lineHe: string }[];
  events: { id: string; titleHe: string; descHe: string; options: { id: string; labelHe: string }[] }[];
  comms: { senderHe: string; textHe: string }[];
  score: { composite: number } | null;
}

function turnPrompt(v: View): string {
  return [
    `תאריך: ${v.dateIso}`,
    `מדדים: ${v.metrics.map((m) => `${m.nameHe} ${'▮'.repeat(m.level + 1)}`).join(' | ')}`,
    `זירות: ${v.fronts.map((f) => `${f.nameHe}[${['רגוע', 'מתוח', 'חם', 'מלחמה'][f.level]}]: ${f.lineHe}`).join(' ')}`,
    v.events.length
      ? `אירועים פתוחים:\n${v.events.map((e) => `- id=${e.id} "${e.titleHe}": ${e.descHe}\n  אפשרויות: ${e.options.map((o) => `[id=${o.id}] ${o.labelHe}`).join(' ; ') || '(אין)'}`).join('\n')}`
      : 'אין אירועים פתוחים.',
    `עדכונים אחרונים:\n${v.comms.slice(-5).map((c) => `- ${c.senderHe}: ${c.textHe}`).join('\n')}`,
    'מה תעשה עכשיו?',
  ].join('\n');
}

// ---- warm CLI session (stream-json), same mechanism the game's live engine uses
class Agent {
  private child = spawn('claude', ['-p', '--verbose', '--input-format', 'stream-json', '--output-format', 'stream-json', '--model', MODEL], {
    shell: process.platform === 'win32', windowsHide: true,
  });
  private buf = '';
  private turn: { resolve: (t: string) => void; text: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor() {
    this.child.stdout!.on('data', (d) => this.onData(String(d)));
  }
  private onData(chunk: string): void {
    this.buf += chunk;
    let i: number;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).trim(); this.buf = this.buf.slice(i + 1);
      if (!line || !this.turn) continue;
      let e: { type?: string; message?: { content?: { type?: string; text?: string }[] } };
      try { e = JSON.parse(line); } catch { continue; }
      if (e.type === 'assistant') {
        for (const c of e.message?.content ?? []) if (c.type === 'text') this.turn.text += c.text ?? '';
      } else if (e.type === 'result') {
        const t = this.turn;
        this.turn = null;
        clearTimeout(t.timer);
        t.resolve(t.text);
      }
    }
  }
  ask(text: string): Promise<string> {
    const run = () => new Promise<string>((resolve) => {
      const timer = setTimeout(() => { if (this.turn) { this.turn = null; resolve(''); } }, 90_000);
      this.turn = { resolve, text: '', timer };
      this.child.stdin!.write(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n', 'utf-8');
    });
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p;
  }
  close(): void { this.child.kill(); }
}

/** Extract the first balanced JSON object, tolerating code fences and truncation. */
function extractObject(raw: string): string | null {
  const text = raw.replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  // truncated mid-object: close it (drop a dangling partial value first)
  let tail = text.slice(start).replace(/,\s*"[^"]*"\s*:\s*"?[^"]*$/, '');
  if (inStr) tail += '"';
  return tail + '}'.repeat(Math.max(1, depth));
}

function parseAction(raw: string): { action: string; eventId?: string; optionId?: string; text?: string; why?: string } | null {
  const obj = extractObject(raw);
  if (!obj) return null;
  try { return JSON.parse(obj); } catch { /* fall through to quote repair */ }
  // repair unescaped inner quotes: only those NOT adjacent to JSON structure
  const repaired = obj.replace(/(?<![:,{[\s])"(?![\s:,}\]])/g, '״');
  try { return JSON.parse(repaired); } catch { return null; }
}

async function main(): Promise<void> {
  const scen = await (await fetch(`${BASE}/api/scenario`)).json() as { provider: string };
  const { runId } = await (await fetch(`${BASE}/api/runs`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.GAME_MODEL ?? 'mock', seed: `naive-${profile}` }),
  })).json() as { runId: string };
  console.log(`profile=${profile} run=${runId} gameProvider=${scen.provider} playerModel=${MODEL}`);

  const agent = new Agent();
  await agent.ask(SYSTEM + '\n\nאשר קליטה ב-JSON: {"action":"wait","why":"מוכן"}');

  const log: string[] = [];
  const deadline = Date.now() + minutes * 60_000;
  let turns = 0;
  while (Date.now() < deadline) {
    const v = await (await fetch(`${BASE}/api/state?runId=${runId}`)).json() as View;
    if (v.ended) break;
    if (v.phase === 'warmup') { await new Promise((r) => setTimeout(r, 2000)); continue; }
    const raw = await agent.ask(turnPrompt(v));
    const act = parseAction(raw);
    turns++;
    if (!act) { log.push(`[${v.dateIso}] (unparsed) ${raw.replace(/\s+/g, ' ').slice(0, 240)}`); continue; }
    log.push(`[${v.dateIso}] ${act.action}${act.optionId ? ` opt=${act.optionId}` : ''}${act.text ? ` "${act.text}"` : ''} — ${act.why ?? ''}`);
    if (act.action === 'option' && act.eventId && act.optionId) {
      await fetch(`${BASE}/api/message`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId, text: '', contextIds: [], eventId: act.eventId, optionId: act.optionId }) });
    } else if (act.action === 'say' && act.text) {
      await fetch(`${BASE}/api/message`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId, text: act.text, contextIds: [] }) });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  agent.close();

  const final = await (await fetch(`${BASE}/api/state?runId=${runId}`)).json() as View;
  const replay = await (await fetch(`${BASE}/api/replay?runId=${runId}`)).json() as { type: string; payload: Record<string, unknown> }[];
  const flags = replay.filter((e) => e.type === 'plan_applied')
    .flatMap((e) => ((e.payload as { plan?: { actorDecisions?: { intent: string }[] } }).plan?.actorDecisions ?? []).map((d) => d.intent))
    .filter((i) => /second_wave|full_war_entry|open_nuclear_sprint|nuclear_demonstration|coordinated_destruction/.test(i));
  const anchors = replay.filter((e) => e.type === 'anchor_fired').map((e) => (e.payload as { anchorId: string }).anchorId);
  const suppressed = replay.filter((e) => e.type === 'anchor_suppressed').map((e) => (e.payload as { anchorId: string }).anchorId);

  mkdirSync(path.join(root, 'docs'), { recursive: true });
  const out = [
    `## naive run — profile: ${profile}`,
    `run=${runId} · turns=${turns} · finalDate=${final.dateIso} · score=${final.score?.composite ?? 'in-progress'}`,
    '',
    `**axis escalation intents fired:** ${flags.length ? [...new Set(flags)].join(', ') : 'NONE'}`,
    `**historical anchors fired (${anchors.length}):** ${anchors.join(', ') || '—'}`,
    `**historical anchors suppressed (${suppressed.length}):** ${suppressed.slice(0, 12).join(', ')}${suppressed.length > 12 ? ' …' : ''}`,
    '',
    '**agent action log:**',
    ...log.map((l) => `- ${l}`),
    '',
  ].join('\n');
  writeFileSync(path.join(root, 'docs', `naive_run_${profile}.md`), out, 'utf-8');
  console.log(out.slice(0, 1400));
}

main().catch((e) => { console.error(e); process.exit(1); });
