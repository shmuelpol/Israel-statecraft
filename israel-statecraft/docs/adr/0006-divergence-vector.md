# ADR 0006 — Divergence as a weighted feature vector, not a scalar

**Decision.** Historical similarity is a vector over: policy posture, timing shifts, leadership survival, actor survival, territorial control, hostage state, capability demonstrations, nuclear state, alliance structure, coalition/public state, commitments/betrayals, events occurred-vs-not. Aggregated for gating into `low/moderate/high`, but retrieval and anchor-eligibility use per-dimension gates (e.g. a dead Sinwar hard-disqualifies nodes that require him regardless of aggregate similarity).

**Alternatives.** Single scalar distance — rejected: allows absurd blends (high aggregate similarity while a load-bearing prerequisite is gone), the exact snapback failure mode the seed forbids.

**Consequences.** "No hidden snapback" is enforceable and testable: historical anchors are candidates only while their own prerequisite dimensions hold. Cost: anchor definitions must declare prerequisites explicitly (done in the canonical timeline data).
