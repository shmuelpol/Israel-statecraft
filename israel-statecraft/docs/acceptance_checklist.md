# Acceptance Checklist — item-by-item against the Definition of Done

Legend: ✅ met · ⚠️ met with noted caveat (see `known_limitations.md`).

## Product and runtime
1. ✅ Starts locally: `npm install`, `npm run dev` (or `npm run build && npm start`).
2. ✅ Production build succeeds (`vite build` + full typecheck).
3. ✅ Playable 2023-09-29 → 2026-12-31 in compressed real time (~16.5 min; playtest-calibrated).
4. ✅ Time never pauses (engine invariant + test).
5. ✅ No speed controls exist.
6. ✅ Responsive during AI work — planning is async; clock never awaits (tested).
7. ✅ Player controls strategy only; no unit control exists anywhere.
8. ✅ World continues when events are ignored (default institutional action; tested §3.2).
9. ✅ Institutions act under default policy (defaultResolver/defaultIntent per event).
10. ✅ No undo exists.

## Interface
11. ✅ Player-facing strings are Hebrew, RTL root (`dir="rtl"`, logical CSS).
12. ✅ Light mode designed (parchment/cream, screenshots 01–05).
13. ✅ Dark mode designed (deep navy, warm text, screenshots 06–07, 11).
14. ✅ Map is the dominant central surface.
15. ✅ Golan continuous with Israel — single polygon in the data; no boundary can render (tested).
16. ✅ West Bank distinct region.
17. ✅ Dynamic territorial control (controller/status/intensity per region + overlays).
18. ✅ Floating map-linked actionable cards with connector lines and anchor pulses.
19. ✅ Pleasant game-like fusion aesthetic; no HUD/steel/neon (screenshots).
20. ✅ No permanent front tabs.
21. ✅ ~10 visible metrics by default.
22. ✅ Qualitative 5-step bars, no numbers (server strips values, sends level 0–4 only).
23. ✅ Unified communication stream with subtle kind styling.
24. ✅ One gameplay textbox for questions/orders/statements/management.
25. ✅ Separate Director channel, visually outside the world (distinct surface/frame).
26. ✅ Meaningful elements are clickable context (regions, metrics, events, comms).
27. ✅ Multi-select with chips + clear-all (screenshot 04).
28. ✅ History pane reviewable during a run.

## Input and consequences
29. ✅ Text mutates nothing directly (state-hash test §3.1).
30. ✅ Adviser answers are delayed, confidence-marked, fog-of-war (tested).
31. ✅ Instructions are attempted and can fail/cost (seeded execution draws).
32. ✅ Public statements create commitments + political/international reactions (tested).
33. ✅ Standing orders persist, cancellable, affect events (readiness, tested).
34. ✅ Late messages accepted after resolution and marked late (tested).
35. ✅ Accepting an offer guarantees nothing (deal-collapse draw; tested §3.3).
36. ✅ Actors lie/retract/raise demands/fail (mediator collapse, covert failures, coalition bluffs).
37. ✅ No card shows predicted metric deltas — schema validator actively rejects them.
38. ✅ No response is a meaningful response (expiry → default action → consequences).
39. ✅ Typing grants a one-time bounded grace; time keeps flowing (tested).

## AI and Atlas
40. ✅ Structured validated output pipeline (all plans schema-checked; invalid → rejected + logged).
41. ⚠️ High-capability offline Atlas path exists (pipeline + critics); generated from authored seeds, not a live model (limitation #6).
42. ✅ Fast runtime path (rule Director; live fast-model adapter wired).
43. ✅ Provider abstraction (anthropic/openai/mock/recorded).
44. ✅ Mock + recorded modes; demos ship in `runs/`.
45. ✅ Actor decisions use actor-limited information (belief-state confinement; audit records usedBeliefKeys).
46. ⚠️ Actor prompts are in each actor's own language (`scenarios/swords-of-iron/prompts/`); mock mode executes equivalent rule policies and records the promptRef (limitation #4).
47. ✅ Decision and adjudication are separate steps.
48. ✅ Atlas has time-indexed epistemic snapshots (ground truth vs beliefs vs known-unknowns).
49. ✅ Long causal chains + counterfactual branches (families A–L with long horizons).
50. ✅ Runtime retrieves several nodes (top-k with compatibility gates).
51. ✅ Director can leave the Atlas (escape mode).
52. ✅ Escapes logged (`atlas_escape` entries; visible in audit).
53. ✅ Historical-like play reproduces the recognizable trajectory (≥80 % of major anchors, order preserved; tested).
54. ✅ Deep divergence does not snap back (suppression by broken prerequisites; tested §6.3; demo-divergent: 27 anchors suppressed).
55. ✅ No future knowledge for earlier actors (frozen-context generation + leakage critic; negative-control tested).
56. ✅ Run facts override Atlas suggestions (retrieval hard gates on run state).
57. ✅ Hidden metrics keep operating (tested).
58. ✅ Persistent argument changes visibility without erasing reality (tested §3.5).
59. ✅ Obvious injection blocked in both channels; extreme in-world policy simulated (red-team suite).

## Randomness, memory, replay
60. ✅ Seeded randomness (named draws, lineage).
61. ✅ Every draw logged with justification.
62. ✅ Complete technical run history (append-only JSONL).
63. ✅ Actor memory with salience decay (imperfect memory).
64. ✅ Commitments/betrayals persist and affect behavior (diplomacy reception, credibility weights).
65. ✅ Visual replay without model calls (fetch-spy test proves zero network).
66. ✅ Decision audit without chain-of-thought (structured rationales only; tested).
67. ✅ Replay includes context selections and late messages.
68. ✅ Scenario/Atlas/model/prompt/engine versions recorded per run.

## Politics, end state, scoring
69. ✅ Player can lose office (coalition collapse or election).
70. ✅ Loss of office → observer mode, run continues (tested §3.6).
71. ✅ Ex-PM messaging continues with weak delayed influence.
72. ✅ Return to office is emergent (momentum + crisis + seeded draw), never a button.
73. ✅ Score hidden during play (server returns null until end; tested).
74. ✅ Final score dynamically assigned under authored guidelines (dimensions, caps, warnings).
75. ✅ Director explains the score via outcomes (Hebrew explanation, screenshot 09).
76. ✅ No judgment of decision quality at the time (explicitly stated in the report text).
77. ✅ No morality meter exists.
78. ✅ Report separates short-term achievement from long-term warnings.
79. ✅ Historical-baseline comparison without naming politicians.

## Engineering and delivery
80. ✅ Strict schemas reject malformed output (tested, incl. delta-leak rejection).
81. ✅ Clock never blocks on AI latency (async planning; stale plans dropped/logged).
82. ✅ No secrets committed (`.env` gitignored; audit ran clean; keys server-side only).
83. ✅ Asset and map licenses documented (`docs/licenses.md`).
84. ✅ Automated tests pass — 63/63 (`npm test`).
85. ✅ Historical, counterfactual, injection, latency-fallback, replay and UI-behavior tests exist.
86. ✅ Architecture + LLD documented (`docs/LLD.md`, `docs/adr/0001–0006`).
87. ✅ Honest, specific limitations (`docs/known_limitations.md`).
88. ✅ Recorded historical-like run (`runs/demo-historical`).
89. ✅ Recorded deeply-divergent run (`runs/demo-divergent`, high divergence, 27 suppressed anchors).
90. ✅ Light + dark screenshots (`docs/screenshots/`, 11 states).
