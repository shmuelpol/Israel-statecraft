# Known Limitations — honest and specific

## AI / model layer

1. **Live AI runs as a warm always-on agent via the local Claude CLI** (`MODEL_PROVIDER=claude-cli`, no API key — the logged-in `claude` CLI held resident in stream-json mode, one long-lived process per run with full conversation context). Measured latency dropped from ~15–45 s (cold process per call, the earlier design) to **~2–8 s per turn** warm; the primer is re-sent automatically on any process restart, and a poisoned/timed-out turn recycles the process. It powers live adviser answers, the meta-Director channel, per-theater deep briefings, and world reactions, with the deterministic rule engine as automatic fallback. Remaining caveats: (a) the HTTP `AnthropicProvider`/`OpenAICompatProvider` adapters are still **untested** (no API key); (b) live texts are non-deterministic — replay still works because the log stores the texts, but a re-simulation will differ; (c) small-model Hebrew (haiku) occasionally has rough phrasing — set `RUNTIME_MODEL` to a stronger model for better prose; (d) content-safety refusals are possible on odd prompts; the fallback covers them.
2. **Mock mode is deterministic and template-based by design.** Each new run draws a fresh seed (different random outcomes, timings, event mixes), but the Hebrew *texts* of events and communications are authored templates — a repeat player will recognize them. `claude-cli` mode is the shipped answer to that (live adviser/meta/world texts); mock remains the always-works demo/CI path (closed decision #70).
3. **Free-text understanding of ORDERS remains pattern-based even in live mode.** Questions, the Director channel and world reactions are live-generated; strategic-order adjudication (what an instruction *does* to the world) stays in the deterministic rule engine to protect causality and replay. Unusual order phrasings fall back to a generic "staff will study this" path.
4. **Actor-language reasoning in the causal engine is structural, not linguistic.** Actor decisions follow rule policies encoding the authored native-language cores, and every decision records the native-language `promptRef`. The prompts (Arabic/Persian/Hebrew/English/Turkish/Russian/Chinese) ship in `scenarios/swords-of-iron/prompts/`; the live session composes surface language but does not yet run per-actor native-language decision calls.

## Simulation depth

5. **Government-attention, adaptation and memory models are first-order.** They satisfy the acceptance behaviors (decay, unlocks, repeated-attempt penalties, grudges) but are scalar approximations, not rich cognitive models.
6. **The Atlas is substantial but generated from authored seeds** (104 nodes: canonical spine, 12 counterfactual families with long horizons, 22 extreme states, critic-verified). It is not the product of a live high-capability research agent; the offline pipeline is where a model key would add the most value (deeper branch texture, more nodes per family).
7. **Some 2026 facts are contested between sources.** The two research passes disagreed on details of the 2026 Lebanon war (full ground war vs. heavy flare-up) and the memorandum's name. The scenario follows the package's normative anchors with verified dates where confirmed; discrepancies are recorded in `research/ledgers/` and `research/verified/`.
8. **Post-2026-08-14 content is simulated future by design** — including the Oct 27, 2026 election outcome (the date is real; the result is computed from run state).

## UI / UX

9. **Desktop-first.** The layout targets ≥1280 px wide; there is no mobile layout.
10. **Map geometry is stylized.** Original simplified polygons (license-free, Golan-continuous by construction); coastlines and borders are recognizable but not survey-accurate.
11. **Accessibility is partial.** Hebrew aria-labels, keyboard focus on metrics, reduced-motion support and contrast-checked palettes exist; a full screen-reader pass was not performed.
12. **Replay viewer is functional, not cinematic** — timeline scrubbing, map/metric/comm reconstruction and the decision audit work from the log alone; animations between keyframes are minimal.

## Engineering

13. **Windows file-watching proved unreliable during development** (stale Vite serving); `usePolling` is enabled in the Vite config as mitigation. Production mode (`npm run build && npm start`) is the recommended way to play.
14. **The server holds active runs in memory.** A server restart ends live runs (their logs up to that point remain replayable). Finished runs are fully persisted.
15. **Calibration used 3 seeds × 10 profiles** (30 full runs). Statistically indicative, not narrow-CI; the harness supports arbitrary seed counts (`scripts/calibrate.ts`).
