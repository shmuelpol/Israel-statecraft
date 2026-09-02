// Live-session demonstration: drives a real game against the claude-cli
// engine — asks an adviser question, argues with the meta Director, and lets
// the world react — then saves screenshots + a text evidence report.
// Prereq: server running with MODEL_PROVIDER=claude-cli. Usage: npx tsx scripts/live-demo.ts

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { Page } from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://localhost:8787';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const exe = CANDIDATES.find((p) => existsSync(p));
if (!exe) throw new Error('no local browser');

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(outDir, name) as `${string}.png` });
  console.log('  ✓', name);
}

async function main(): Promise<void> {
  const scenario = await (await fetch(`${BASE}/api/scenario`)).json() as { provider: string };
  if (scenario.provider !== 'claude-cli') throw new Error(`server provider is ${scenario.provider}, expected claude-cli`);
  console.log('provider: claude-cli ✓');

  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--lang=he'], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.dataset.theme = 'light'; });
  await page.click('.bigbtn');
  await page.waitForSelector('.map-svg', { timeout: 15000 });
  const runId = await page.evaluate(() => location.hash.replace('#/game/', ''));
  console.log('run:', runId);

  // let the war open, then ask the Chief of Staff a real question
  await wait(12000);
  await page.type('.composer-row textarea', 'מה ההערכה שלך לגבי הסיכון שחזבאללה יפתח במלחמה כוללת בשבועות הקרובים?');
  await page.keyboard.press('Enter');
  console.log('adviser question sent; waiting for live answer…');

  // meanwhile argue with the meta Director
  await wait(2000);
  await page.click('.director-fab');
  await page.waitForSelector('.director-drawer');
  await page.type('.director-input input', 'למה מדד ההרתעה ירד אחרי המתקפה? הרי הגבנו בעוצמה');
  await page.keyboard.press('Enter');
  console.log('director-channel question sent…');

  // live calls take ~20-40s each and are serialized; give the session time
  await wait(130_000);
  await shot(page, '12_live_director_channel.png');
  const dirClose = await page.$('.director-drawer .iconbtn');
  if (dirClose) await dirClose.click();
  await wait(75_000); // world-reaction digests keep arriving
  await shot(page, '13_live_session_feed.png');

  // pull the state and extract the live artifacts as text evidence
  const state = await (await fetch(`${BASE}/api/state?runId=${runId}`)).json() as {
    comms: { senderHe: string; kind: string; textHe: string; inReplyTo?: string }[];
    directorChat: { from: string; textHe: string }[];
    playerMessages: { text: string; status: string }[];
  };
  const replay = await (await fetch(`${BASE}/api/replay?runId=${runId}`)).json() as { type: string; payload: Record<string, unknown> }[];
  const latencies = replay.filter((e) => e.type === 'latency').map((e) => e.payload);

  const report = [
    '# Live AI Session Evidence (claude-cli engine)',
    '',
    `Run: ${runId} — provider claude-cli (local logged-in \`claude\` CLI, model ${process.env.RUNTIME_MODEL ?? 'claude-haiku-4-5-20251001'}).`,
    'The deterministic rule engine remains the causal backbone; the live session generated the texts below at play time.',
    '',
    '## Player question → live adviser answer',
    ...state.playerMessages.map((m) => `- [שאלת השחקן] ${m.text} (status: ${m.status})`),
    ...state.comms.filter((c) => c.inReplyTo).map((c) => `- [${c.senderHe} · ${c.kind}] ${c.textHe}`),
    '',
    '## Meta Director channel (live)',
    ...state.directorChat.map((d) => `- [${d.from}] ${d.textHe}`),
    '',
    '## Live world reactions in the feed (last 12 comms)',
    ...state.comms.slice(-12).map((c) => `- [${c.senderHe} · ${c.kind}] ${c.textHe}`),
    '',
    '## AI-call latency log (from the replay log)',
    ...latencies.map((l) => `- ${JSON.stringify(l)}`),
  ].join('\n');
  writeFileSync(path.join(root, 'docs', 'live_session_evidence.md'), report, 'utf-8');
  console.log('evidence → docs/live_session_evidence.md');
  console.log('latency entries:', latencies.length);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
