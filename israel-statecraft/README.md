# ממלכתיות — Israel Statecraft Simulation (Swords of Iron, 2023–2026)

A real-time, AI-directed strategy game: you are Israel's Prime Minister from the eve of October 7, 2023 through the end of 2026. You set strategy — the world decides what happens. Hebrew-only RTL interface, deterministic replayable engine, offline strategic Atlas, and a meta-level Game Director channel.

Built as an autonomous one-shot implementation of the handoff package in the parent directory (see `../START_HERE.md`). Design docs: [PLAN.md](PLAN.md), [docs/LLD.md](docs/LLD.md), [docs/adr/](docs/adr/).

## Quick start

Prerequisites: Node.js ≥ 20 (developed on 26), npm. No API key needed — mock mode is a full deterministic game.

```bash
npm install
npm run dev          # dev servers → http://localhost:5173
```

Production (recommended — avoids Windows file-watcher quirks):

```bash
npm run build
npm start            # → http://localhost:8787
```

**Live AI mode (no key needed):** if you're logged into the Claude CLI (`claude login`), run:

```bash
npx cross-env NODE_ENV=production MODEL_PROVIDER=claude-cli npm start
```

Now the **home screen offers a model picker**: the deterministic engine (⚙️ instant, no AI, no cost) or a live model via the CLI — Haiku 4.5 (fast), Sonnet 5 (balanced), Opus 5 / Fable 5 (richest Hebrew, slower). Your choice applies per run and the active engine is shown in the game top bar. A warm always-on Claude session then powers adviser answers, the Game Director channel, per-theater deep briefings and world reactions live, following the run's developments; the deterministic rule engine stays as the causal backbone and automatic fallback. Started in the default `mock` mode, only the deterministic engine is offered. HTTP API modes (`anthropic`/`openai` + key in `.env`) exist but are untested — see `docs/known_limitations.md`.

## Commands

| command | purpose |
|---|---|
| `npm run dev` | local development (game server 8787 + client 5173) |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | full automated suite (63 tests: engine, director, atlas, replay, alternative-history, red-team) |
| `npm run atlas` | regenerate the Atlas + critic passes + coverage report |
| `npm run calibrate` | 30 headless runs across 10 policy profiles → `docs/calibration_report.md` |
| `npm run record-demos` | re-record the two shipped demo runs |

## What ships

- **Generic engine** (`engine/`) — deterministic real-time simulation: seeded named draws, event lifecycle with default institutional action, hidden variables, territory, commitments, attention, divergence vector, append-only replay log.
- **Scenario package** (`scenarios/swords-of-iron/`) — verified 2023→Aug-2026 canonical timeline as data (war-relative scheduling), 21 actors with native-language decision cores (`prompts/`), original map geometry (Golan continuous with Israel by construction; West Bank distinct), opening attractor, scoring guidelines.
- **AI layer** (`ai/`) — provider abstraction (mock/recorded/Anthropic/OpenAI), Hebrew intent classification + injection defense, rule-engine Director encoding the authored worldview, Atlas retrieval with hard compatibility gates, meta Director channel, dynamic final scoring.
- **Atlas** (`atlas/`) — 104 critic-verified nodes: canonical spine, counterfactual families A–L with long horizons, 22 extreme states. Critics: future-knowledge leakage, historical snapback (0 %), diversity, physical validity, commitment preservation.
- **Client** (`app/client/`) — Hebrew RTL: dominant map, floating anchored event cards, qualitative metric bars, unified feed, one gameplay textbox with clickable context chips, Director drawer, light/dark, history pane, replay viewer with decision audit.
- **Evidence** — `runs/demo-historical` and `runs/demo-divergent` (replayable without any model), `docs/screenshots/` (11 states), `docs/calibration_report.md`, `docs/acceptance_checklist.md`, `docs/known_limitations.md`.

## Play notes

- There is no pause and no undo. Ignoring an event is a decision — an institution will act for you.
- Everything meaningful is clickable: map regions, metrics, feed messages, event cards → context chips for your next instruction.
- The 🎭 button (bottom-left) opens the Game Director — a meta channel *outside* the world, for arguing about interpretation and metrics. The world doesn't hear it.
- Your score appears only at the end, judged on outcomes — never on whether your choices "looked right" at the time.
