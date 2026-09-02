// Model-provider abstraction (HLD §4). The runtime never blocks on these:
// callers race against timeouts and fall back to the deterministic rule
// Director. Keys are read from the environment server-side only.

export interface ModelRequest {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** name of the JSON contract expected; used for logging + repair prompts */
  schemaName: string;
}

export interface ModelResponse {
  ok: boolean;
  json?: unknown;
  raw?: string;
  error?: string;
  latencyMs: number;
}

export interface ModelProvider {
  readonly name: string;
  complete(req: ModelRequest): Promise<ModelResponse>;
}

function extractJson(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no JSON object in output');
  return JSON.parse(m[0]);
}

async function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class AnthropicProvider implements ModelProvider {
  readonly name = 'anthropic';
  constructor(private apiKey: string) {}
  async complete(req: ModelRequest): Promise<ModelResponse> {
    const t0 = Date.now();
    try {
      const res = await timedFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens ?? 1024,
          system: req.system,
          messages: [{ role: 'user', content: req.user }],
        }),
      }, req.timeoutMs ?? 8000);
      const body = (await res.json()) as { content?: { text?: string }[]; error?: { message?: string } };
      if (!res.ok) return { ok: false, error: body?.error?.message ?? `http ${res.status}`, latencyMs: Date.now() - t0 };
      const text = body.content?.map((c) => c.text ?? '').join('') ?? '';
      return { ok: true, json: extractJson(text), raw: text, latencyMs: Date.now() - t0 };
    } catch (e) {
      return { ok: false, error: String(e), latencyMs: Date.now() - t0 };
    }
  }
}

export class OpenAICompatProvider implements ModelProvider {
  readonly name = 'openai';
  constructor(private apiKey: string, private baseUrl = 'https://api.openai.com/v1') {}
  async complete(req: ModelRequest): Promise<ModelResponse> {
    const t0 = Date.now();
    try {
      const res = await timedFetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens ?? 1024,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
        }),
      }, req.timeoutMs ?? 8000);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
      if (!res.ok) return { ok: false, error: body?.error?.message ?? `http ${res.status}`, latencyMs: Date.now() - t0 };
      const text = body.choices?.[0]?.message?.content ?? '';
      return { ok: true, json: extractJson(text), raw: text, latencyMs: Date.now() - t0 };
    } catch (e) {
      return { ok: false, error: String(e), latencyMs: Date.now() - t0 };
    }
  }
}

/** Replays stored outputs keyed by schemaName+hash; used by recorded mode. */
export class RecordedProvider implements ModelProvider {
  readonly name = 'recorded';
  constructor(private recordings: Record<string, unknown[]>) {}
  private cursors: Record<string, number> = {};
  async complete(req: ModelRequest): Promise<ModelResponse> {
    const list = this.recordings[req.schemaName] ?? [];
    const i = this.cursors[req.schemaName] ?? 0;
    if (i >= list.length) return { ok: false, error: 'no recorded output left', latencyMs: 0 };
    this.cursors[req.schemaName] = i + 1;
    return { ok: true, json: list[i], latencyMs: 0 };
  }
}

/**
 * Mock provider: signals the orchestrator to use the deterministic rule
 * Director (ADR 0003). It never fabricates model output.
 */
export class MockProvider implements ModelProvider {
  readonly name = 'mock';
  async complete(): Promise<ModelResponse> {
    return { ok: false, error: 'mock mode: rule engine handles decisions', latencyMs: 0 };
  }
}

export interface ProviderConfig {
  mode: string;
  anthropicKey?: string;
  openaiKey?: string;
  openaiBaseUrl?: string;
  runtimeModel: string;
  atlasModel: string;
}

export function selectProvider(cfg: ProviderConfig): ModelProvider {
  if (cfg.mode === 'anthropic' && cfg.anthropicKey) return new AnthropicProvider(cfg.anthropicKey);
  if (cfg.mode === 'openai' && cfg.openaiKey) return new OpenAICompatProvider(cfg.openaiKey, cfg.openaiBaseUrl);
  return new MockProvider();
}
