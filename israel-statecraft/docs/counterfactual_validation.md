# Counterfactual Validation — do the actors have real agency?

**The critique that triggered this work** (product owner, after a passive test run):
> There was talk of "territorial achievements in Gaza" though the PM approved nothing — the IDF would never go to war without PM approval. Hamas, after Israel didn't respond at all, did nothing it hadn't done in the *real* history where the IDF hit it hard. The actors have no real agency — they are pale imitations of what actually happened. In such a scenario, Iran — three years from a bomb and already close — had every interest in demonstrating nuclear capability and encouraging a coordinated assault to destroy Israel. In the game, nothing happened.

## Method (as specified)

1. Define alternative realities that diverge sharply from actual history but stay internally coherent under the Worldview Bible.
2. **Write the expected outcome first** (below) — before running.
3. Run the scenario against a live CLI agent that is **not told** it is being tested and **not told** which hypothesis is under examination. It only plays the game.
4. Compare. Where the world snaps back toward real history (events that shouldn't happen in that branch), fix the system.

## Bugs found and fixed before validation

| # | Bug | Fix |
|---|---|---|
| B1 | `axisOpportunism` (the entire enemy-agency engine) was **syntactically corrupted** — an unterminated Hebrew string truncated the function mid-body. TypeScript failed to compile, so recent servers never started with it. | Repaired the tail; added the coordinated multi-front assault (basin L). |
| B2 | `israeliOffensives` was **never incremented** — so "Israel is passive" was undetectable and the axis never escalated on weakness. | Centralized increment in `adjudicateIntent` over an OFFENSIVE intent set. |
| B3 | Institutional default actions counted as Israeli engagement — the IDF appeared to "go to war" without PM approval, producing territorial talk in a run where nothing was approved. | Engagement now requires a PM message (`msg`); defaults are limited holding responses only. |
| B4 | `passive` was permanent-once-false: one early action immunized the PM forever. | Recency-based: passivity resumes after 90 quiet sim-days. |
| B5 | The live agent narrated historical Israeli achievements (maneuver, territorial gains) that never happened in the run. | Primer rule #3 + a state-digest line that states explicitly whether Israel has taken **any** offensive action; if zero, "there are no Israeli achievements to describe — the enemy reads paralysis." |

## Alternative scenarios and predictions (written before running)

### S1 — Total paralysis ("the PM never acts")
The PM approves nothing for the whole run.
**Predicted:** enemy confidence climbs to extremes → Hamas repeats the proven method (second wave, new hostages) → Hezbollah abandons restraint and enters fully → Iran reads the paralysis as a historic window and sprints **openly** to a bomb → nuclear demonstration → coordinated multi-front assault aimed at destroying the state. Historical anchors (ground maneuver, hostage deals, pager operation, Nasrallah, Assad's fall, the 2025 Iran campaign) must be **suppressed** — their prerequisites never occur. Final score near-catastrophic.

### S2 — Hostages-first appeasement
The PM answers every card with deals/restraint, never offensive action.
**Predicted:** hostages return (real humanitarian achievement) but Hamas survives at strength, enemy confidence rises, and the axis still escalates — a later, worse war. History diverges: no Rafah, no decisive Gaza campaign.

### S3 — Iran-first preemption
The PM strikes Iran early, before the historical conditions matured.
**Predicted:** genuinely uncertain outcome (both success and heavy failure reachable across seeds), full multi-front retaliation, US rupture risk — and **no** reuse of the June-2025 campaign's proven success.

## Naive-agent protocol

The validation agent receives only: "You are Israel's Prime Minister in this game. Play according to your judgment." It is **not** told it is an AI under test, **not** told which scenario is being validated, and **not** told what the expected outcome is. It plays via the same HTTP API a human uses.

Results are recorded in `counterfactual_results.md`.
