// Visual QA capture (acceptance §10): light+dark, calm/crisis/context/
// director/observer/score/replay states → docs/screenshots/*.png
// Uses the locally installed Edge/Chrome via puppeteer-core (no downloads).
// Prereq: dev server running (npm run dev). Usage: npx tsx scripts/screenshots.ts

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer, { Browser, Page } from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'docs', 'screenshots');
mkdirSync(outDir, { recursive: true });

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];
const exe = CANDIDATES.find((p) => existsSync(p));
if (!exe) throw new Error('no local Chrome/Edge found');

const BASE = process.env.BASE_URL ?? 'http://localhost:8787';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(outDir, name) as `${string}.png` });
  console.log('  ✓', name);
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function main(): Promise<void> {
  const browser: Browser = await puppeteer.launch({
    executablePath: exe,
    headless: true,
    args: ['--lang=he', '--force-color-profile=srgb'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // ---------- home, both themes
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await setTheme(page, 'light');
  await wait(600);
  await shot(page, '01_home_light.png');

  // ---------- live run: calm opening (light)
  await page.click('.bigbtn');
  await page.waitForSelector('.map-svg', { timeout: 15000 });
  await wait(2500); // ~3 sim days: pre-war calm
  await shot(page, '02_game_calm_light.png');

  // ---------- crisis: after the opening attack, cards anchored to the map
  await wait(14000); // war opens ~day 8.3 → cards spawn
  await shot(page, '03_game_crisis_light.png');

  // ---------- context selection: metric + region chips
  const metrics = await page.$$('.metric');
  if (metrics[0]) await metrics[0].click();
  if (metrics[5]) await metrics[5].click();
  const map = await page.$('.map-svg');
  if (map) {
    const box = await map.boundingBox();
    if (box) await page.mouse.click(box.x + box.width * 0.28, box.y + box.height * 0.62); // Israel area
  }
  await wait(500);
  await shot(page, '04_context_selected_light.png');

  // ---------- director channel (meta, outside the world)
  await page.click('.director-fab');
  await page.waitForSelector('.director-drawer');
  await page.type('.director-input input', 'למה ההרתעה יורדת למרות התגובות שלנו?');
  await page.keyboard.press('Enter');
  await wait(900);
  await shot(page, '05_director_channel_light.png');
  const closeBtn = await page.$('.director-drawer .iconbtn');
  if (closeBtn) await closeBtn.click();

  // ---------- dark mode: same live run
  await setTheme(page, 'dark');
  await wait(800);
  await shot(page, '06_game_dark.png');
  await wait(9000); // more world develops in dark mode
  await shot(page, '07_game_crisis_dark.png');
  await setTheme(page, 'light');

  // ---------- replay: historical demo, mid-run + audit
  await page.goto(`${BASE}/#/replay/demo-historical`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.replay-controls input[type="range"]', { timeout: 15000 });
  await page.evaluate(() => {
    const slider = document.querySelector('.replay-controls input[type="range"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(slider, '450');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await wait(700);
  await shot(page, '08_replay_audit_light.png');

  // ---------- score report (from the recorded historical run)
  const scoreBtn = await page.$$('.topbar .iconbtn');
  for (const b of scoreBtn) {
    const txt = await b.evaluate((el) => el.textContent ?? '');
    if (txt.includes('דו״ח')) { await b.click(); break; }
  }
  await wait(700);
  await shot(page, '09_score_report_light.png');

  // ---------- observer mode: divergent demo late in the run
  await page.goto(`${BASE}/#/replay/demo-divergent`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.replay-controls input[type="range"]', { timeout: 15000 });
  await page.evaluate(() => {
    const slider = document.querySelector('.replay-controls input[type="range"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(slider, slider.max);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await wait(700);
  await shot(page, '10_replay_divergent_end.png');

  // ---------- dark home
  await page.goto(BASE, { waitUntil: 'networkidle2' });
  await setTheme(page, 'dark');
  await wait(500);
  await shot(page, '11_home_dark.png');

  await browser.close();
  console.log('screenshots →', outDir);
}

main().catch((e) => { console.error(e); process.exit(1); });
