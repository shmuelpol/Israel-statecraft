# Unresolved-Fact Ledger

Facts where sources disagree or verification failed; each entry names how the scenario handles it.

| id | question | positions | scenario handling |
|---|---|---|---|
| U1 | Scale of the 2026 Israel–Hezbollah conflict | Research pass A: ground war from Mar 2 (Litani crossing, Bint Jbeil); pass B: heavy flare-up + strikes, no new full ground war until the June framework | Modeled as `lebanon_war_2026` (enemy reactivation + Israeli response options); the ground-maneuver decision is left to the player, matching the package's normative H12 anchor "a new Lebanon war begins" |
| U2 | Name/venue of the June 2026 US–Iran memorandum | "Islamabad Memorandum" (pass A) vs "Versailles MOU" (pass B) | Anchor id `islamabad_memorandum`; player-facing text avoids the venue name ("מזכר 14 נקודות… בתיווך פקיסטני־קטארי") |
| U3 | S09 (AP Iran-timeline article id) | URL could not be located by either pass | Claims resting on it re-sourced (Wikipedia/CRS/ISW cross-checks in `verified/claims_ledger.json`) |
| U4 | UNSC 2803 digital-library record | un.org record blocked to automated access | Resolution text, date (2025-11-17) and vote (13-0-2) verified via secondary official sources |
| U5 | Gaza control % at each 2024 phase | Journalistic estimates range widely (30–40 % Dec 2023; ~75 % Aug 2025) | Territory is qualitative in-game (controller/status/intensity), so ranges suffice; exact percentages appear only in research ledgers with confidence flags |
| U6 | Interim hostage living/deceased splits (mid-2024) | Definitional differences between official counts | Game tracks a single reconciled series from `ledgers/hostage_timeline.json` (medium confidence flagged) |
| U7 | Iranian HEU status after Feb 2026 strikes | No IAEA access since Jul 2025; estimates only | Modeled as hidden `iran_nuclear_progress` with intel-quality-dependent adviser answers — uncertainty is gameplay |
