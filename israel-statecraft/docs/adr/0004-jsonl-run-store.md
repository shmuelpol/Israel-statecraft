# ADR 0004 — Append-only JSONL run store

**Decision.** Each run is a directory under `runs/`: `meta.json` (versions: scenario, atlas, prompts, models, seed), `log.jsonl` (every ReplayEntry), `final.json` (score report). Replay folds the log; no database.

**Alternatives.** SQLite — rejected: native-module friction on Windows and no query needs beyond scan; IndexedDB (client-side) — rejected: state must live server-side with the model keys.

**Consequences.** Runs are portable evidence artifacts (shipped demo runs are literally the store format); human-auditable; replay-without-model is structurally guaranteed because replay only reads the log. Trade-off: large runs are re-read sequentially (fine at <10k entries/run).
