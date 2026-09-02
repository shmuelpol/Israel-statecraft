// Local Claude CLI provider — a live model with no API key: uses the user's
// logged-in `claude` CLI in headless print mode. A persistent session
// (--resume) keeps the Director's context across calls so the AI genuinely
// follows the run's developments. Calls are sequential (session resume is not
// concurrent-safe) and time-boxed; the engine never blocks on them.

import { spawn } from 'node:child_process';
import type { ModelProvider, ModelRequest, ModelResponse } from './provider.js';

export interface CliCallResult {
  ok: boolean;
  json?: unknown;
  raw?: string;
  sessionId?: string;
  error?: string;
  latencyMs: number;
}

export function extractJsonBlock(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON object in model output');
  try {
    return JSON.parse(m[0]);
  } catch {
    // common model slip: unescaped double quotes inside Hebrew strings —
    // convert inner quotes that sit between letters/spaces to gershayim
    const repaired = m[0].replace(/(?<=[֐-׿a-zA-Z0-9 ,.!?:;־-])"(?=[֐-׿a-zA-Z0-9 ,.!?:;־-])/g, '״');
    return JSON.parse(repaired);
  }
}

export async function runClaudeCli(prompt: string, opts: { model: string; timeoutMs: number; resume?: string; cwd?: string }): Promise<CliCallResult> {
  const t0 = Date.now();
  // The prompt is piped via STDIN: multi-line Hebrew content as an argv token
  // breaks cmd.exe quoting on Windows. All argv tokens stay shell-safe.
  const args = ['-p', '--output-format', 'json', '--model', opts.model];
  if (opts.resume) args.push('--resume', opts.resume);
  return new Promise<CliCallResult>((resolve) => {
    const child = spawn('claude', args, {
      shell: process.platform === 'win32',
      cwd: opts.cwd,
      windowsHide: true,
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' },
    });
    child.stdin.write(prompt, 'utf-8');
    child.stdin.end();
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, error: `cli timeout after ${opts.timeoutMs}ms`, latencyMs: Date.now() - t0 });
    }, opts.timeoutMs);
    child.stdout.on('data', (d) => { out += String(d); });
    child.stderr.on('data', (d) => { err += String(d); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: String(e), latencyMs: Date.now() - t0 }); });
    child.on('close', () => {
      clearTimeout(timer);
      const latencyMs = Date.now() - t0;
      let body: { is_error?: boolean; result?: string; session_id?: string } | undefined;
      try {
        body = JSON.parse(out) as typeof body;
      } catch (e) {
        return resolve({ ok: false, error: `cli envelope parse failure: ${String(e).slice(0, 160)} | stderr: ${err.slice(0, 120)}`, latencyMs });
      }
      if (body?.is_error) return resolve({ ok: false, error: String(body.result).slice(0, 300), sessionId: body.session_id, latencyMs });
      try {
        const json = extractJsonBlock(body?.result ?? '');
        resolve({ ok: true, json, raw: body?.result, sessionId: body?.session_id, latencyMs });
      } catch (e) {
        // model produced prose instead of JSON — session continuity survives
        resolve({ ok: false, error: `model output parse failure: ${String(e).slice(0, 160)}`, raw: body?.result, sessionId: body?.session_id, latencyMs });
      }
    });
  });
}

/** Stateless adapter satisfying the generic ModelProvider contract. */
export class ClaudeCliProvider implements ModelProvider {
  readonly name = 'claude-cli';
  constructor(private model: string) {}
  async complete(req: ModelRequest): Promise<ModelResponse> {
    const res = await runClaudeCli(`${req.system}\n\n${req.user}`, { model: this.model, timeoutMs: req.timeoutMs ?? 60_000 });
    return { ok: res.ok, json: res.json, raw: res.raw, error: res.error, latencyMs: res.latencyMs };
  }
}

/** Common contract for live sessions (per-call or warm stream). */
export interface LiveSession {
  readonly busy: boolean;
  setPrimer(text: string): void;
  send(prompt: string): Promise<CliCallResult>;
}

/**
 * Persistent conversational session via one CLI process per call (--resume).
 * All sends are serialized; `busy` lets callers skip optional work.
 */
export class ClaudeCliSession implements LiveSession {
  private sessionId: string | undefined;
  private chain: Promise<unknown> = Promise.resolve();
  private pending = 0;
  private primer: string | null = null;
  private primerSent = false;
  constructor(private model: string, private timeoutMs = 75_000) {}

  get busy(): boolean { return this.pending > 0; }

  setPrimer(text: string): void { this.primer = text; }

  send(prompt: string): Promise<CliCallResult> {
    this.pending++;
    const run = async (): Promise<CliCallResult> => {
      try {
        if (this.primer && !this.primerSent) {
          this.primerSent = true;
          const res = await runClaudeCli(this.primer, { model: this.model, timeoutMs: this.timeoutMs });
          if (res.sessionId) this.sessionId = res.sessionId;
        }
        const res = await runClaudeCli(prompt, { model: this.model, timeoutMs: this.timeoutMs, resume: this.sessionId });
        if (res.sessionId) this.sessionId = res.sessionId;
        return res;
      } finally {
        this.pending--;
      }
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p as Promise<CliCallResult>;
  }
}

/**
 * WARM always-on agent: one long-lived `claude` process in stream-json mode.
 * The model stays resident with full conversation context — measured latency
 * drops from ~15-45s (cold process per call) to ~2-8s per turn. The primer is
 * re-sent automatically whenever the process (re)starts; on crash or timeout
 * the process is restarted on the next send.
 */
export class ClaudeCliStreamSession implements LiveSession {
  private child: ReturnType<typeof spawn> | null = null;
  private buffer = '';
  private turn: { resolve: (r: CliCallResult) => void; t0: number; text: string; timer: ReturnType<typeof setTimeout> } | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private pending = 0;
  private primer: string | null = null;
  private primerPending = false;

  constructor(private model: string, private timeoutMs = 60_000) {}

  get busy(): boolean { return this.pending > 0; }

  setPrimer(text: string): void { this.primer = text; }

  private ensureProcess(): void {
    if (this.child && this.child.exitCode === null) return;
    this.buffer = '';
    this.child = spawn('claude', ['-p', '--verbose', '--input-format', 'stream-json', '--output-format', 'stream-json', '--model', this.model], {
      shell: process.platform === 'win32',
      windowsHide: true,
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' },
    });
    this.primerPending = this.primer !== null;
    this.child.stdout!.on('data', (d) => this.onData(String(d)));
    this.child.on('close', () => {
      // fail the in-flight turn; next send() restarts the process
      if (this.turn) {
        clearTimeout(this.turn.timer);
        this.turn.resolve({ ok: false, error: 'stream process exited', latencyMs: Date.now() - this.turn.t0 });
        this.turn = null;
      }
    });
  }

  private writeUser(text: string): void {
    const line = JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n';
    this.child!.stdin!.write(line, 'utf-8');
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let evt: { type?: string; is_error?: boolean; message?: { content?: { type?: string; text?: string }[] } };
      try { evt = JSON.parse(line); } catch { continue; }
      if (!this.turn) continue; // primer turn or unsolicited events
      if (evt.type === 'assistant') {
        for (const c of evt.message?.content ?? []) if (c.type === 'text') this.turn.text += c.text ?? '';
      } else if (evt.type === 'result') {
        const t = this.turn;
        this.turn = null;
        clearTimeout(t.timer);
        const latencyMs = Date.now() - t.t0;
        if (evt.is_error) return t.resolve({ ok: false, error: t.text.slice(0, 300) || 'stream turn error', latencyMs });
        try {
          t.resolve({ ok: true, json: extractJsonBlock(t.text), raw: t.text, latencyMs });
        } catch (e) {
          t.resolve({ ok: false, error: `model output parse failure: ${String(e).slice(0, 160)}`, raw: t.text, latencyMs });
        }
      }
    }
  }

  /** Wait for the primer turn's result event without treating it as a caller turn. */
  private awaitPrimer(): Promise<void> {
    return new Promise((resolve) => {
      const t0 = Date.now();
      this.turn = {
        t0, text: '',
        resolve: () => resolve(),
        timer: setTimeout(() => { this.turn = null; resolve(); }, this.timeoutMs),
      };
      this.writeUser(this.primer!);
    });
  }

  send(prompt: string): Promise<CliCallResult> {
    this.pending++;
    const run = async (): Promise<CliCallResult> => {
      try {
        this.ensureProcess();
        if (this.primerPending && this.primer) {
          this.primerPending = false;
          await this.awaitPrimer();
        }
        return await new Promise<CliCallResult>((resolve) => {
          const t0 = Date.now();
          const timer = setTimeout(() => {
            if (this.turn) {
              this.turn = null;
              this.child?.kill(); // poisoned turn: recycle the process
              resolve({ ok: false, error: `stream turn timeout after ${this.timeoutMs}ms`, latencyMs: Date.now() - t0 });
            }
          }, this.timeoutMs);
          this.turn = { resolve, t0, text: '', timer };
          this.writeUser(prompt);
        });
      } finally {
        this.pending--;
      }
    };
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => undefined);
    return p as Promise<CliCallResult>;
  }
}
