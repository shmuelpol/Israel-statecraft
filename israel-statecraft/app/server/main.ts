// Local application server: HTTP API + WebSocket push + static client serving.
// Model keys (if any) live here and are never exposed to the browser.

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { RunManager } from './runManager.js';
import { SCENARIO } from '../../scenarios/swords-of-iron/index.js';
import { POINTS, MAP_BOUNDS } from '../../scenarios/swords-of-iron/regions.js';
import { selectProvider } from '../../ai/src/provider.js';
import { ClaudeCliStreamSession } from '../../ai/src/claudeCli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// minimal .env loader (no dependency)
const envPath = path.join(root, '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const providerMode = process.env.MODEL_PROVIDER ?? 'mock';
const runtimeModel = process.env.RUNTIME_MODEL ?? 'claude-haiku-4-5-20251001';
const provider = selectProvider({
  mode: providerMode,
  anthropicKey: process.env.ANTHROPIC_API_KEY || undefined,
  openaiKey: process.env.OPENAI_API_KEY || undefined,
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  runtimeModel,
  atlasModel: process.env.ATLAS_MODEL ?? 'claude-fable-5',
});

// claude-cli mode: a persistent live AI session per run, powered by the local
// logged-in `claude` CLI (no API key). Deterministic rules remain the backbone.
// The player picks the model per run at the home screen; a live session is
// created only when a live model is chosen and the CLI factory is available.
const providerName = providerMode === 'claude-cli' ? 'claude-cli' : provider.name;
const makeLiveSession = providerMode === 'claude-cli'
  ? (model: string) => new ClaudeCliStreamSession(model)
  : undefined;

/** Model options offered in the home-screen picker. */
const LIVE_MODELS = [
  { id: 'claude-haiku-4-5-20251001', nameHe: 'Claude Haiku 4.5', noteHe: 'מהיר וזול — עברית פשוטה', tier: 'fast' },
  { id: 'claude-sonnet-5', nameHe: 'Claude Sonnet 5', noteHe: 'איזון בין איכות למהירות', tier: 'balanced' },
  { id: 'claude-opus-5', nameHe: 'Claude Opus 5', noteHe: 'איכות גבוהה — איטי ויקר יותר', tier: 'strong' },
  { id: 'claude-fable-5', nameHe: 'Claude Fable 5', noteHe: 'המתקדם ביותר — עברית עשירה', tier: 'strong' },
];
const availableModels = [
  { id: 'mock', nameHe: 'מנוע דטרמיניסטי', noteHe: 'ללא AI חי — מיידי, זהה בכל ריצה, ללא עלות', tier: 'mock' },
  ...(makeLiveSession ? LIVE_MODELS : []),
];
const defaultModel = makeLiveSession ? runtimeModel : 'mock';

const manager = new RunManager(path.join(root, 'runs'), providerName, makeLiveSession, availableModels);
const PORT = Number(process.env.PORT ?? 8787);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2',
};

function json(res: http.ServerResponse, code: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data);
}

async function readBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

const scenarioInfo = {
  meta: SCENARIO.meta,
  clock: SCENARIO.clock,
  metrics: SCENARIO.metrics.map((m) => ({ id: m.id, nameHe: m.nameHe, descHe: m.descHe, icon: m.icon })),
  regions: SCENARIO.regions,
  points: POINTS,
  bounds: MAP_BOUNDS,
  actors: SCENARIO.actors.map((a) => ({ id: a.id, nameHe: a.nameHe })),
  provider: providerName,
  models: availableModels,
  defaultModel,
  liveAvailable: !!makeLiveSession,
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (p === '/api/scenario') return json(res, 200, scenarioInfo);
    if (p === '/api/runs' && req.method === 'POST') {
      const body = await readBody(req);
      const run = manager.create(
        typeof body.seed === 'string' && body.seed ? body.seed : undefined,
        typeof body.model === 'string' ? body.model : undefined,
      );
      return json(res, 200, { runId: run.runId });
    }
    if (p === '/api/runs' && req.method === 'GET') return json(res, 200, manager.listRecorded());
    if (p === '/api/state') {
      const run = manager.get(url.searchParams.get('runId') ?? '');
      return run ? json(res, 200, run.view()) : json(res, 404, { error: 'run not found' });
    }
    if (p === '/api/message' && req.method === 'POST') {
      const b = await readBody(req);
      const run = manager.get(String(b.runId ?? ''));
      if (!run) return json(res, 404, { error: 'run not found' });
      const channel = ['auto', 'internal', 'public'].includes(String(b.channel)) ? (String(b.channel) as 'auto' | 'internal' | 'public') : 'auto';
      run.handleMessage(String(b.text ?? ''), Array.isArray(b.contextIds) ? b.contextIds.map(String) : [], b.eventId ? String(b.eventId) : undefined, b.optionId ? String(b.optionId) : undefined, channel);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/briefing') {
      const run = manager.get(url.searchParams.get('runId') ?? '');
      if (!run) return json(res, 404, { error: 'run not found' });
      return json(res, 200, run.briefing(url.searchParams.get('topic') ?? 'gaza'));
    }
    if (p === '/api/briefing-deep' && req.method === 'POST') {
      const b = await readBody(req);
      const run = manager.get(String(b.runId ?? ''));
      if (!run) return json(res, 404, { error: 'run not found' });
      const ok = run.requestDeepBriefing(String(b.topic ?? 'gaza'));
      return json(res, 200, { ok, live: ok });
    }
    if (p === '/api/typing' && req.method === 'POST') {
      const b = await readBody(req);
      manager.get(String(b.runId ?? ''))?.handleTyping();
      return json(res, 200, { ok: true });
    }
    if (p === '/api/context' && req.method === 'POST') {
      const b = await readBody(req);
      manager.get(String(b.runId ?? ''))?.handleContext(Array.isArray(b.ids) ? b.ids.map(String) : []);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/director' && req.method === 'POST') {
      const b = await readBody(req);
      const run = manager.get(String(b.runId ?? ''));
      if (!run) return json(res, 404, { error: 'run not found' });
      run.handleDirectorMessage(String(b.text ?? ''));
      return json(res, 200, { ok: true });
    }
    if (p === '/api/replay') {
      const entries = manager.readReplay(url.searchParams.get('runId') ?? '');
      return entries ? json(res, 200, entries) : json(res, 404, { error: 'no log' });
    }
    if (p.startsWith('/api/')) return json(res, 404, { error: 'unknown endpoint' });

    // static client (production build)
    const dist = path.join(root, 'app', 'client', 'dist');
    let file = path.join(dist, p === '/' ? 'index.html' : p.slice(1));
    if (!file.startsWith(dist)) return json(res, 403, { error: 'forbidden' });
    if (!existsSync(file)) file = path.join(dist, 'index.html'); // SPA fallback
    if (!existsSync(file)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('client not built — run `npm run build` or use `npm run dev`');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (e) {
    json(res, 500, { error: String(e) });
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url ?? '', `http://localhost:${PORT}`);
  const run = manager.get(url.searchParams.get('runId') ?? '');
  if (!run) { ws.close(); return; }
  const off = run.onUpdate((e) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(e));
  });
  ws.on('close', off);
});

server.listen(PORT, () => {
  console.log(`israel-statecraft server on http://localhost:${PORT} (provider: ${providerName}${providerName === 'claude-cli' ? `, model: ${runtimeModel}` : ''})`);
});
