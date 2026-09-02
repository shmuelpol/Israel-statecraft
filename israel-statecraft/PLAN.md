# Execution Plan — Israel Statecraft Simulation

Autonomous one-shot build per `../START_HERE.md` and `../ONE_SHOT_UBER_PROMPT.md`.
Execution date: 2026-08-14. Product owner questions: none permitted.

## Phases

1. **Research continuation** — two background web-research passes: (a) verify package sources S01–S20 and build a verified 2023→Aug-2026 timeline; (b) hostage / territory / leadership / capability / US-policy / domestic ledgers. Outputs land in `research/`. Where verification fails, claims are preserved with explicit `unverified` status; the authored worldview and package anchors take precedence per the handoff's authority order.
2. **LLD** — `docs/LLD.md` + `docs/adr/`. Stack: TypeScript end-to-end; Vite+React client; dependency-light Node server (`ws` for realtime); JSONL append-only run store; zod-style hand validation via typed guards + strict schema checkers; Vitest.
3. **Engine** — deterministic real-time simulation core (`engine/`): clock, named seeded RNG, state, events, metrics, hidden variables, territory, attention, commitments, standing policies, divergence, observer mode, replay log.
4. **Scenario package** — `scenarios/swords-of-iron/`: Hebrew content, actors with native-language decision cores, canonical timeline, original stylized map geometry (Golan continuous with Israel; West Bank distinct), opening attractor, scoring guidelines.
5. **Atlas pipeline** — `atlas/`: generator + critics (future-leakage, historical snapback, diversity, physical validity) producing a substantial initial Atlas (canonical spine H0–H13 expanded + counterfactual families A–L + extreme-state coverage), retrieval index, coverage report.
6. **AI layer** — `ai/`: provider abstraction (Anthropic / OpenAI-compatible / mock / recorded), message classification & routing, injection filter, actor-language decision calls with belief-limited context, separate adjudication, Director planning producing schema-validated WorldPlans, meta-channel Director, final scoring.
7. **App** — local server + Hebrew-RTL client: dominant map, floating anchored event cards, metric bars, unified feed, one gameplay textbox, clickable context, Director channel outside the world frame, light/dark, history, replay viewer, score screen.
8. **Tests & calibration** — Vitest suites mapped to the acceptance matrix; headless calibration harness over 10 policy profiles; recorded historical-like and deeply divergent demo runs.
9. **Delivery** — screenshots (light/dark, calm/crisis/context/observer/score/replay), calibration report, known limitations, acceptance checklist, licenses, run instructions.

## Non-negotiables tracked throughout

- Real time, no pause, no speed controls; clock never blocks on AI.
- Hebrew-only RTL player UI; both themes designed.
- Golan rendered continuous with Israel; West Bank distinct.
- Text input mutates nothing directly; world responds with delay and fog.
- Seeded, recorded randomness; deterministic replay with zero model calls.
- No rubber-banding; outcome-judging score, hidden until the end.
- Mock/recorded mode keeps everything demonstrable without an API key.
