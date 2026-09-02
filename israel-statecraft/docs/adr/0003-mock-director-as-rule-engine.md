# ADR 0003 — Mock mode is a deterministic rule-engine Director, not canned text

**Decision.** `MockProvider` implements the full Director/actor pipeline as deterministic rules encoding the authored worldview (actor priority orders, opening attractor, escalation ladders, divergence handling). It emits the same schema-validated `WorldPlan`/decision objects as live models.

**Alternatives.** (a) Static scripted event list — rejected: cannot satisfy counterfactual acceptance tests (world must respond causally to arbitrary policy); (b) requiring a live key for tests — rejected by the brief (demonstrable without a key) and untestable in CI.

**Consequences.** The whole game is playable, calibratable, and replayable offline; live-model mode swaps in real reasoning through identical contracts. Trade-off: mock free-text understanding is keyword/intent-pattern based (documented in known limitations); live mode upgrades comprehension without touching the engine.
