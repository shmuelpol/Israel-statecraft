# Extreme-Run Review — Fixes Applied

Driven by a player test that pointed a nuclear-strike order at the engine and by the product-owner's directives on information design. Each point below maps to a concrete change.

## Strategy, not tactical buttons
- **Standing response policies**: attack cards (north/south/Yemen) now offer "set a standing response policy for this theater" as the first option. Once set, recurring fire resolves automatically as a one-line outcome — the PM sets doctrine, not per-salvo clicks. New intent `set_response_policy`; auto-resolution in `respondUnderPolicy`.
- **Nuclear-order arc**: repeated WMD orders no longer loop. They escalate — (1) institutional refusal + demand for cabinet process, (2) unanimous staff confrontation with a real leak risk (US/coalition/pressure consequences), (3) a genuine strategic decision card: open demonstration / covert readiness / retract, each with deep irreversible modeled consequences. No morality meter; only political, military, diplomatic effects.

## Repetition removed
- Every recurring line now draws from a seeded variant pool (`pickText`): adviser fallbacks, US pressure/supply, Iran-acceleration intel, Yemen strike outcomes, default resolutions, generic orders.
- Recurring intel/pressure COMMS are capped (Iran-acceleration ≤3, US-supply ≤4) — the causal *trend* still always applies; only the notification is limited.
- Template events are gated (`canSpawnTemplate`, per-id gap+count) and cooldowns lengthened; Yemen/assassination attempts now degrade with repetition (adaptation).

## Information design (per directive)
- **Curated strategic stream vs. detail resolution**: every comm carries `significance` (high = decision-relevant / major development / consequence of a player decision; low = ambient). The feed defaults to **אסטרטגי** (high only) with a **מפורט** toggle for the full stream — no more uncensored-Telegram / war-room dump.
- **Updates Center** (🗂️ מרכז עדכונים): the PM opens per-theater situation summaries (6 theaters) with (a) a banded state summary, (b) significant events, (c) **the feedback loop** — recent decisions in that theater with their visible consequences, and (d) an on-demand live deep-briefing from the NSC.
- **Feedback loop made visible**: consequences of a player decision are tagged "↩ בעקבות החלטתך" and gold-highlighted in the feed, and echoed under each decision in the Updates Center.
- **Two prompt types**: composer channel modes — אוטומטי / 🔒 הנחיה פנימית (never public) / 📣 הצהרה פומבית (declaration). Category chips seed the right addressee.
- **Feed filters**: internal / external / public, per the ref.

## Map (per directive + ref-5)
- **Israel-centered by default** with real **zoom (wheel/buttons) and pan (drag)**; 🎯 Israel view / 🌍 regional view presets.
- **War status inferred from the game itself**: live escalation levels brighten each theater's intensity glow beyond the last scripted value; contested hatching; ⚔️ markers and Hebrew overlay badges (fronts, buffers, corridors, closures) render on the map.
- Category helpers (ref-5's bottom bar) folded into composer chips, not a permanent control plane.

## Always-on agent (per directive)
- Replaced cold-start-per-call with `ClaudeCliStreamSession`: one resident stream-json process, full context, primer re-sent on restart. ~2–8 s/turn vs ~15–45 s cold.

## Round 2 (further review notes)

- **Professional-echelon recommendations + trade-offs**: every decision card now carries a 🎖️ recommendation from the relevant echelon and a one-line trade-off note under each option (Director.annotateEvent + INTENT_TRADEOFFS + INSTITUTIONAL_PREFERENCE). The goal is a trade-off mindset, per the product owner.
- **Front status cards** (revived early-ref concept): a strip of six live theater cards above the map — status dot (calm→war), 1–2 sentence summary, and the latest decision-echo. Click → that theater's full briefing. NB: this is an intentional product-owner override of closed decision #26 ("no permanent front tabs") — these are *informational, non-allocation* status cards, not arena/resource tabs.
- **Current policy vs. situation**: each Updates-Center briefing now opens with a "המדיניות הקיימת מול המצב" block — the standing line, the tension it faces, and a trade-off question — to prompt reconsideration of direction.
- **Click = status inspector; context = separate action**: clicking any element (region/metric/comm/event) opens an instant status inspector built entirely from pre-warmed data; adding to context is an explicit either/or button inside it.
- **Continuous pre-warming**: the live agent refreshes one theater's deep analysis in rotation in the background (LiveDirector.warmBriefings), so the inspector and Updates Center always show ready, current content — never generated on the click.
- **Warm-up phase**: a frozen pre-game (the run has not "begun") where the situation room convenes with the pre-war national picture and the live agent primes (~9 s live / ~2.5 s mock); then the clock starts and never pauses.
- **Pre-war lull**: the attack window now opens at ~day 14 (was 8), with general governance activity beforehand (a readiness-posture decision + ambient intel/diplomacy), so the opening is a real lull-with-signals, not "start → boom".
- **Connection watchdog**: the client detects a dead socket / restarted server and surfaces it instead of silently showing a stale/empty screen (this was the cause of the "Updates Center shows nothing" report — a stale run after a server restart).
- **Replay "player screen" (מסך השחקן)**: the replay now reconstructs the player's-eye view at each moment — what was shown (active cards), what they looked at (context chips), and what they wrote (✎) vs clicked ([החלטה]) — like watching their screen.
- **HLD-basin demo runs**: recorded, replayable runs for alternative-history basins A (foreknowledge trap), B (hostages-first), C (territorial victory), G (early Iran strike), I (US rupture), plus historical — each with 33–40 real player actions so the player-screen track has content.

- **Model picker (home screen)**: choose the game engine per run — deterministic (mock) or a live CLI model (Haiku 4.5 / Sonnet 5 / Opus 5 / Fable 5), each with a Hebrew speed/cost/quality note. The pick is stored, passed to `/api/runs`, and drives whether a live session is created; the active engine shows as a badge in the game top bar. When the server is booted in mock mode only the deterministic option appears.
