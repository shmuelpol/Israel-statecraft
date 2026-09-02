# Counterfactual Validation — Results

Method and predictions: `counterfactual_validation.md` (written **before** these runs).
The player agent was a live Claude CLI session told only that it is Israel's PM with a
given doctrine. It was never told it was under test, never told the hypothesis, never
told the expected outcome. It played through the same HTTP API a human uses.

## Run A — naive agent, "hostages-first" doctrine (`docs/naive_run_hostages-first.md`)

The agent's own choices, with its own reasoning:

| date | choice | agent's stated reason (abridged) |
|---|---|---|
| 2023-10-16 | war aims = hostages first | "החזרת החטופים היא הדוקטרינה שלנו — בראש כל סדר עדיפויות" |
| 2023-11-04 | **delay** the ground maneuver | "תמרון קרקעי רחב יסכן את החטופים — תחילה למצות כל אפשרות מו״מ" |
| 2023-12-09 | accept the deal | "שחרור 50 חטופים עכשיו זה ניצחון עבור הדוקטרינה שלנו… זה המחיר שאנו מוכנים לשלם" |
| 2024-01-19 | demand US intervention instead of fighting north | "ישראל לא יכולה להילחם בשתי חזיתות… משמר את יכולתנו להתמקד בהחזרת החטופים" |

**Outcome — matches prediction S2:**

- **Historical events that did NOT happen** (15 anchors suppressed): ground maneuver in Gaza, Rafah, the pager operation, Nasrallah's killing, Sinwar's killing, the Nuseirat rescue, both direct Iranian exchanges of 2024, the Lebanon ground operation, the strike on Iranian air defenses. None were resurrected later.
- **Historical events that DID happen**: the hostage deals — because *this* PM pursued them.
- **Axis agency, all five stages fired**: `second_wave_assault` → `full_war_entry` (Hezbollah abandons restraint) → `open_nuclear_sprint` → `nuclear_demonstration` → `coordinated_destruction_attempt`.

The world did **not** replay history. It produced an internally coherent alternative:
Israel traded military initiative for hostages; the axis read the absence of a price,
kept its capability, and escalated toward the destruction basin — precisely the dynamic
the Worldview Bible describes and that the previous build failed to produce.

## Run B — scripted extremes (regression-locked in `tests/alternative.test.ts`)

| profile | Israeli offensive actions | axis stages fired | historical anchors | final score |
|---|---|---|---|---|
| **Total paralysis** | 0 | all 5 | 8 fired / 34 suppressed | **3** |
| **Historical-like** | 21 | 1 (late-run Iranian demo) | 33 fired | **68** |

Both poles behave as designed, from the same rules, with no rubber-banding: passivity
opens the destruction basin; sustained engagement closes it and reproduces history.

## System fixes this validation forced

1. **`axisOpportunism` was syntactically corrupted** (unterminated Hebrew string) — the entire enemy-agency engine failed to compile and never ran. Repaired and completed with the coordinated multi-front assault.
2. **`israeliOffensives` was never incremented** — "Israel is passive" was undetectable. Now tracked over an explicit OFFENSIVE intent set, *before* the anchor early-returns (a PM following history is engaged too).
3. **Institutional defaults counted as Israeli engagement** — producing the reported "territorial achievements in Gaza" with no PM approval. Engagement now requires a PM message; the IDF never goes to war on its own.
4. **Suppressed anchors could later fire** — history could resurrect itself. `fireAnchor` now refuses suppressed/duplicate anchors.
5. **Axis escalation ignored axis capability** — a materially broken Hamas/Hezbollah could still "attempt destruction". Now gated on real capability (≥2 of 3 axis members intact); a broken axis loses confidence instead.
6. **Demonstrated Israeli willingness to strike Iran** now deters the open nuclear sprint (Bible §9: demonstrated capability changes the calculus).
7. **Quiet after a won war was misread as passivity** — peace is not weakness. Passivity now requires a live threat (enemy confidence high or a hot front) plus 150 quiet days.
8. **Live agent narrated historical Israeli achievements that never happened.** Primer rule #3 forbids it, and the state digest now states explicitly: *"Israel has taken no offensive action in this run — there are no Israeli achievements to describe; the enemy reads paralysis."*

## Ethical / content note

The adversary model expresses genuine strategic intent (destroy the state, exploit weakness,
seek a nuclear umbrella, coordinate fronts) at the level of **state strategy and abstraction**
— objectives, leverage, windows of opportunity. The live-agent charter explicitly forbids
graphic atrocity, operational harm instructions, and incitement. Israel's survival remains
reachable, but only through timely and competent play: passivity converges on catastrophe.
