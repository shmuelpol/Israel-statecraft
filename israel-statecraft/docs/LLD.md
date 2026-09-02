# LLD — Israel Statecraft Simulation

Status: implemented. Companion decision records in `docs/adr/`.

## 1. Stack

| Concern | Choice | Rationale (see ADRs) |
|---|---|---|
| Language | TypeScript everywhere | one type system across engine/AI/UI; strict schemas shared |
| Client | React 18 + Vite | mature RTL support, fast dev server, SVG-friendly |
| Server | Node `http` + `ws` | dependency-light, no framework needed for ~12 endpoints + 1 socket |
| Persistence | JSONL append-only per run + snapshots (`runs/`) | durable, portable, human-auditable, replay-native |
| Validation | hand-written strict validators (`engine/src/schema.ts`) | zero deps, rejects malformed AI output field-by-field |
| Tests | Vitest | fast, TS-native |
| Map | original stylized SVG geometry (authored, license-free) | full control over the Golan rendering requirement; extreme-state overlays composable |

No runtime dependency carries GPL. Full list in `docs/licenses.md`.

## 2. Repository layout

```
israel-statecraft/
  app/client/        Vite+React Hebrew RTL client
  app/server/        local server: run manager, HTTP+WS, persistence
  engine/src/        deterministic simulation core (no AI, no IO)
  ai/src/            providers, classification, actor calls, director, scoring
  atlas/src/         generator + critics; atlas/out/ generated artifacts
  scenarios/swords-of-iron/  scenario package (data + Hebrew content + prompts)
  research/          verified research products and ledgers
  tests/             vitest suites (unit/integration/property/red-team)
  scripts/           calibrate, record demo runs, build atlas
  docs/              LLD, ADRs, calibration report, limitations, screenshots
  runs/              recorded runs (includes shipped demo runs)
```

## 3. Time model

- Real-time tick: **250 ms**. Sim speed: **2.5 sim-days per real second** (0.625 day/tick), scenario-configurable.
- Scenario span 2023-09-29 → 2026-12-31 ≈ 1189 days ≈ **7.9 minutes** per full run. Calibration target: 1–2 significant decisions per sim month ⇒ roughly one actionable event every 10–20 real seconds in normal load.
- The clock lives in the engine and **never awaits** anything. AI planning runs asynchronously; plans apply at the next tick boundary after validation. Late plans are reinterpreted or discarded (logged with latency).
- Event urgency categories (Hebrew UI labels): `immediate` ≈ 10 s, `urgent` ≈ 18 s, `window` ≈ 30 s real time. Typing into the composer grants a one-time grace (+40 % of remaining, max 6 s) per event — time itself never stops.
- Adviser answer delay: 2–8 real seconds (sim hours-to-days), drawn from the named RNG.

## 4. Deterministic engine (`engine/`)

Pure TypeScript, no IO. Everything that changes state flows through `applyEffects(state, effects, rng, log)` so replay = fold(log).

- **State** (`GameState`): sim date, office status, visible metric set + values (0–100 internal floats, rendered as 5-step qualitative bars + trend), hidden variables, territory regions (controller, status, intensity), actors (beliefs, memory, relationships, adaptation, leadership), active/scheduled events, standing policies, commitments, attention (hidden map topic→score with decay), divergence vector, RNG lineage counters, Atlas provenance of the active plan.
- **RNG**: mulberry32 seeded from `hash(runSeed, drawName, counter)`. Every draw records `{name, lineage, range, value, justification}` to the replay log. Replay reuses recorded values and never re-rolls.
- **Events**: scheduled by plans; lifecycle `scheduled → active → (answered | expired) → resolved`; expiry triggers the default institutional resolution (e.g. Chief of Staff acts under standing policy); every card carries 2–4 predefined responses + free-text + ask-adviser affordances; **no predicted metric deltas anywhere**.
- **Player messages**: append to history instantly; a processing record tracks classify→route→actor→respond with sim-time delays; a message never mutates state directly. Late submissions after event resolution become "late instructions" the Director judges for residual relevance.
- **Attention**: inferred from context selections, question/order repetition, standing policies, public emphasis; decays ~3 %/sim-day; gates option readiness, intel quality, execution speed.
- **Divergence**: weighted feature vector against canonical-timeline anchors — policy, timing, leadership survival, territory, hostages, capabilities, alliances, commitments, events-that-did/didn't-happen. Aggregated to `low | moderate | high`. High divergence strips historical anchors of privilege (they simply stop being injected as candidates; there is no snapback force).
- **Observer mode**: on losing office normal actionable cards stop; a modeled replacement government policy runs; ex-PM messages route through a weak delayed influence channel; return to office is an emergent threshold event.

## 5. AI layer (`ai/`)

### Providers
`ModelProvider` interface: `complete(request) → structured JSON`, with timeout, retry-with-repair, cancellation. Implementations: `AnthropicProvider`, `OpenAICompatProvider` (both env-key based, never sent to the browser), `MockProvider` (deterministic rule engine, default), `RecordedProvider` (replays stored outputs byte-for-byte). Mode auto-selects: recorded > live > mock by configuration.

### Pipeline per planning cycle (every ~6 s real / ~15 sim-days horizon)
1. Snapshot run state → compact structured context (never the raw log; bounded size).
2. Detect actors needing decisions; build each actor's **belief-limited** context (facts filtered by `knowableBy`).
3. Actor decision call **in the actor's own strategic language** (prompt templates under `scenarios/swords-of-iron/prompts/`; mock mode executes rule policies encoding the same authored cores, and stores the native-language prompt that *would* be sent for audit).
4. Separate adjudication step converts intents → consequences for Israel/world; seeded execution uncertainty applied via named draws.
5. Atlas retrieval (top-k compatible nodes) feeds candidate futures; Director may adopt, blend, or escape (escapes logged with reason).
6. Director emits a `WorldPlan` (trends, scheduled events, comms, map changes, option unlocks/closures, required draws, provenance). Strict validation; invalid plans rejected and the previous plan keeps running.

### Meta Director channel
Separate conversation lane, distinct visual identity, never in-world. Can explain causality concisely, disagree, admit uncertainty, change metric visibility, add a modeled metric (data-driven `DynamicMechanic` proposal, validated before activation). Cannot rewrite facts, expose prompts/chain-of-thought, or grant victory. Injection filter (Hebrew+English heuristics) runs on both lanes; blocked attempts get an explicit in-Hebrew refusal state and a log entry. Extreme *in-world* policy passes through to simulation.

### Scoring
Final report generated from the end-state snapshot + irreversible-loss ledger under `scoring_guidelines` in the scenario package; Director explanation is composed in Hebrew from outcome facts (mock mode) or model output validated against the report schema (live mode). Hidden during play.

## 6. Atlas (`atlas/`)

- **Node schema** — `AtlasNode`: id, date, state signature (feature vector), era, branch id/family, ground truth, per-actor beliefs (+known/unknown unknowns), capabilities vs perceived, goals/priorities, fears/red lines, time horizons, willingness to pay, commitments, domestic constraints, international attitudes, who-benefits-from-time, open/latent/closed options, expected developments, counterfactual trajectories (with long-horizon continuations), exogenous/endogenous dependencies, map-state primitives, source refs + confidence, similarity criteria.
- **Generator** (`scripts/build-atlas.ts` → `atlas/out/atlas.json`): expands the canonical spine (H0–H13) into fine-grained nodes; generates counterfactual families A–L as multi-node trajectories with blind-context discipline (each node's builder only receives data dated ≤ node date — enforced structurally, checked by critic); emits required extreme-state coverage (all 22 states from the seed §7).
- **Critics** (all must pass in CI): future-knowledge leakage; historical snapback (branch reintroduces an anchor without its prerequisites); diversity (pairwise signature distance below threshold ⇒ fail); physical validity (dead leaders don't act, territory states legal, capability anachronisms); commitment preservation. Snapback rate is measured and reported in `atlas/out/coverage_report.md`.
- **Retrieval**: cosine-over-weighted-features nearest-k on state signatures with hard compatibility gates (actor-survival and territorial contradictions disqualify); returns provenance for logging.

## 7. Structured contracts

All in `engine/src/types.ts` + validated in `engine/src/schema.ts`: `GameState`, `ActorState`, `PlayerMessage`, `ActionableEvent`, `AtlasNode`, `WorldPlan`, `ReplayEntry`, `FinalScoreReport`, `DynamicMechanic`. Malformed AI output → reject + keep previous plan + log.

## 8. Client (`app/client/`)

Layout per the UI brief: top bar (scenario title, Hebrew date, subtle progress, theme toggle, history, Director button); left ~10 qualitative metric bars; right unified feed with subtle type styling (internal/public/diplomatic/intel/hostile); center dominant map (SVG, stylized illustrated look, light+dark palettes); floating event cards anchored to geography with connector lines (max 3 visible); bottom single gameplay composer with context chips; Director drawer visually outside the world (different surface, frame, and typography); end-of-run score screen; replay viewer (log-driven, zero model calls) with decision audit.

Interaction rules: every meaningful element (region, metric, event, message, actor, overlay) implements `ContextTarget` — click toggles selection, halo + chip feedback, multi-select, clear-all, stale references resolved at send time. No permanent arena tabs. No numeric metric values by default. RTL: `dir="rtl"` root, logical CSS properties only.

## 9. Testing & calibration

- Unit/property suites for every engine invariant in the acceptance matrix §2/§4 (time monotonicity, no-pause, no direct text mutation, belief-state confinement, no-snapback, hidden-metric persistence, RNG replay stability, schema rejection, injection, replay-without-model).
- Integration flows §3.1–3.7 scripted against a headless server with MockProvider.
- Historical-reproduction test: scripted historical-like policy ⇒ recognizable trajectory (anchor coverage ≥ threshold, order preserved). Alternative-history tests §6.1–6.11 with causal assertions.
- Calibration harness (`scripts/calibrate.ts`): 10 policy profiles × N seeds headless; reports success distribution, catastrophe rate, event density, overload/boredom windows, snapback rate, score distribution → `docs/calibration_report.md`. Difficulty tuned via initial conditions and causal rules only (no runtime rubber-banding exists in code).

## 10. Runtime & config

- `npm run dev` — server (port 8787) + Vite client (port 5173, proxied).
- `npm run build && npm start` — production build served by the local server.
- `.env.example` documents `MODEL_PROVIDER=mock|recorded|anthropic|openai`, keys, model names. No secrets committed; keys live server-side only.
- Mock mode is the default and passes every test and demo without network access.
