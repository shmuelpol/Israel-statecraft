# Decision Log — Closed Product Decisions and LLD Freedom

## A. Closed product decisions

1. The player is Israel's Prime Minister.
2. The player controls strategy and government policy, not tactics.
3. The first scenario runs from shortly before October 7, 2023 through December 31, 2026.
4. The engine must support future scenario packages.
5. The game is always real-time after the run begins.
6. There is no pause.
7. There are no speed controls.
8. A normal initial run is approximately eight minutes, subject to calibration.
9. Ignoring an event is a meaningful response.
10. Internal institutions may act when the Prime Minister does not.
11. Beginning to type may briefly delay a default institutional response but never freeze time.
12. A late draft can still be submitted after the original event resolves.
13. The player uses one gameplay textbox for questions, instructions, public statements, international statements, diplomacy, and management.
14. Gameplay text has no immediate magical world effect.
15. Adviser answers are delayed and subject to fog of war.
16. There is a separate meta-level Game Director channel.
17. Every meaningful UI element is clickable context.
18. Context may combine map regions, metrics, events, messages, actors, and history.
19. Important on-map events are actionable.
20. Informational news may appear in the communication feed without a decision card.
21. Action cards never reveal exact predicted metric changes.
22. Accepting an offer does not guarantee performance by the other side.
23. Actors may lie, retract, raise demands, miscalculate, or fail.
24. The map is the main play surface.
25. The map changes dynamically with territory and regime state.
26. Permanent arena tabs are not used.
27. Government attention is a hidden inferred state rather than an allocated points resource.
28. Approximately ten metrics are visible by default.
29. Metrics are qualitative bars without exact numbers by default.
30. The UI does not classify metrics as success, constraint, or resource.
31. Metrics may be hidden, replaced, or expanded.
32. Persistent Director discussion may introduce a new visible and causally real metric.
33. Hiding a metric never deletes its hidden effect.
34. Internal Israeli political actors are abstract roles or blocs rather than named politicians.
35. External historical personalities may exist and change.
36. Actor decisions are made in each actor's own strategic language.
37. Actors decide for their own goals before effects on Israel are adjudicated.
38. The Director may leave the Atlas.
39. The Atlas is advisory; worldview and current-run history are authoritative.
40. The Atlas must aggressively resist hindsight and historical snapback.
41. Real history is a strong prior only while the run remains similar.
42. Deep divergence must produce a fully inhabited alternative history.
43. External events unaffected by Israel continue historically.
44. The October 7 opening cannot be solved through player foreknowledge.
45. The opening leads broadly to an October 7-like event or a more dangerous coordinated attack.
46. The game is hard by nature and never rubber-bands against a strong player.
47. Randomness is mild, seeded, and recorded.
48. The Director reports outcomes without telling the player that a random roll occurred.
49. The game judges outcomes, not decision quality at the time.
50. The score is hidden during play.
51. The final score is assigned dynamically by the Director under authored guidelines.
52. The final evaluation is weighted primarily toward the end-state snapshot.
53. Irreversible losses and structural damage remain relevant.
54. There is no abstract morality meter.
55. Loss of office enters observer mode rather than ending the run.
56. Persistent opposition activity may eventually affect a return to office.
57. Returning to office is emergent, not a button.
58. There is no undo.
59. Every run is fully logged and replayable without new model calls.
60. Previous runs do not affect new runs in the first release.
61. The GUI is Hebrew-only and RTL.
62. Both light and dark modes are required.
63. The aesthetic is a fusion of pleasant old browser/Flash strategy games and modern polish.
64. The aesthetic must not resemble a tactical military HUD or Call of Duty.
65. The Golan Heights are rendered as an uninterrupted part of Israel without special indication.
66. The West Bank is rendered as a distinct region.
67. Prompt injection is blocked immediately.
68. Radical in-world policy is simulated rather than blocked.
69. The game runs locally.
70. A mock or recorded mode is required for demonstration without a live model key.

## B. Closed worldview decisions

1. Israel's survival is not automatic.
2. Israel requires long-term qualitative excellence.
3. Deterrence is strongly affected by durable loss of territory, control, strategic assets, hostage leverage, military continuity, and organizational survival.
4. Enemy victory narratives have real long-term value even when materially distorted.
5. Narrative distortion can also create medium-term enemy miscalculation.
6. Hostages are both human objectives and strategic leverage.
7. There is no trivial perfect hostage solution.
8. Major hostile actors seek Israel's eventual destruction, with different willingness to pay and constraints.
9. Hamas treats destruction of Israel as a terminal objective and its own survival as a means to continue that project.
10. Hamas can accept extreme Gaza losses but generally does not choose its own pointless annihilation.
11. Hezbollah prioritizes organizational survival before destruction of Israel and is constrained by Lebanese society.
12. Iran prioritizes regime survival, then destruction of Israel, proxy preservation, nuclear capability, regional dominance, avoidance of direct war, and economy.
13. Iran's proxies are both an offensive network and a deterrent shield.
14. An Iranian nuclear threshold is extremely dangerous but not automatic game over.
15. Palestinian hostility is modeled as primarily ideological rather than an automatic product of poverty.
16. Prosperity does not automatically moderate hostility.
17. Deterrence can reduce willingness to act while hostility remains.
18. Different actors optimize over different time horizons.
19. Quiet may be used by enemies to prepare.
20. Preventive action can be rational and politically costly because the prevented disaster is invisible.
21. International strategic standing and global antisemitism or delegitimization are distinct.
22. The United States relationship and strategic autonomy are distinct.
23. Human capital, education, technology, science, talent retention, and migration matter to long-term survival.
24. Social cohesion is distinct from morale and public pressure.
25. Normalization matters when it creates real foreign interest in Israel's survival.
26. Territory is a first-class strategic asset.
27. The costs of victory are real but do not automatically erase the value of victory.
28. Military success may create a governance problem, but the governance vacuum is not assumed worse by default.
29. Public statements are real strategic actions.
30. Past commitments, betrayals, and precedents remain causal.
31. Persistence is itself a causal action.

## C. LLD decisions intentionally delegated to the autonomous agent

The agent should decide through experiments and testing:

- frontend framework;
- local server framework;
- persistence technology;
- map-rendering library;
- exact geographic dataset;
- exact simulation clock compression;
- exact runtime Director planning cadence;
- exact adviser-response delay ranges;
- event expiry ranges;
- internal numeric scales;
- historical-similarity representation;
- Atlas indexing and retrieval technology;
- state clustering method;
- counterfactual sampling strategy;
- model providers and model selection;
- prompt and context compression;
- local model or API support;
- exact default visible metric set;
- exact final score rubric within the authored guidelines;
- exact UI component implementation;
- exact animation system;
- exact mock-run content;
- exact calibration thresholds.

## D. Research questions delegated to continued research

The agent must investigate rather than ask the product owner:

- exact historical counts and dates;
- exact pre-October warning and multi-front planning record;
- time-indexed foreign attitudes;
- actor capabilities at each date;
- military stock and spare-part constraints;
- exact hostage status timeline;
- Syrian, Hezbollah, Iranian, United States, Turkish, Russian, Gulf, and Egyptian decision context;
- what capabilities were known versus demonstrated later;
- the current verified history through the execution date;
- unresolved factual disputes.
