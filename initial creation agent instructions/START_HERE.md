# START HERE — Autonomous Codex Handoff

You are receiving a complete one-way product handoff for a locally runnable, AI-directed, real-time strategy game about governing Israel during the Swords of Iron war and its wider regional consequences.

This is a non-interactive assignment. Do not ask the product owner questions. Read every normative document in this package, resolve implementation-level uncertainty through research and experiments, and deliver the complete playable product rather than a plan or scaffold.

## Read in this order

1. `ONE_SHOT_UBER_PROMPT.md` — the controlling execution brief.
2. `00_PRODUCT_VISION_AND_DECISIONS.md` — concise product intent and decisions already closed.
3. `01_WORLDVIEW_BIBLE.md` — authored causal worldview, actor motives, and hidden strategic assumptions.
4. `02_ATLAS_SEED.md` — historical and counterfactual seed for the offline Atlas pipeline.
5. `03_IMPLEMENTATION_REQUIREMENTS.md` — architecture, runtime, UI, data, replay, testing, and delivery requirements.
6. `04_RESEARCH_CONTINUATION_AND_SOURCE_SEED.md` — research method, source hierarchy, and initial source map.
7. `05_ACCEPTANCE_AND_TEST_MATRIX.md` — definition of done and mandatory test coverage.
8. `06_UI_UX_REFERENCE_BRIEF.md` — visual principles and interpretation of the included mockups.
9. `07_DECISION_LOG.md` — compact list of closed decisions, worldview commitments, and delegated LLD freedom.

All documents are normative unless a passage is explicitly labeled `non-binding`, `illustrative`, `candidate`, or `open for LLD experimentation`.

## Precedence

When two instructions appear to conflict, use this order:

1. Product invariants and explicit decisions in the Uber Prompt.
2. Authored worldview and actor cores.
3. Current-run facts and causal continuity.
4. Verified historical research.
5. Atlas suggestions.
6. Your own LLD and implementation judgment.

Historical research may correct dates, counts, capabilities, and event details. It must not silently neutralize the authored worldview, because the worldview is intentional game content.

## Required outcome

Deliver a polished local application with:

- a generic scenario engine;
- a substantial 2023–2026 scenario;
- a dynamic map;
- Hebrew-only RTL player UI;
- light and dark modes;
- real-time non-pausing play;
- map-linked actionable events;
- one natural-language gameplay input;
- a separate meta-level Game Director channel;
- an offline Atlas-generation pipeline;
- a fast runtime AI Director;
- actor-specific decision prompts in each actor's own strategic language;
- deterministic replay from recorded outputs;
- historical-like and deeply divergent counterfactual runs;
- automated tests and calibration evidence;
- a recorded or mock mode that remains demonstrable without a live model key.

Do not stop at HLD, LLD, research notes, a UI mockup, or a vertical slice. Complete and test the game.
