# ADR 0005 — Time compression 2.5 sim-days/second, 250 ms tick

**Decision.** Default 2.5 sim-days per real second (full 2023-09-29→2026-12-31 run ≈ 7.9 min), 250 ms engine tick, Director planning cycle ~6 s real (~15 sim-days horizon), urgency windows 10/18/30 s.

**Experiment basis.** Calibration harness (`scripts/calibrate.ts`) sweeps event cadence across policy profiles; chosen constants hit the target of ~1–2 significant decisions per sim-month without routine flooding (see `docs/calibration_report.md`). Values are scenario config, not engine constants.

**Consequences.** An "8-minute session" per the vision; decision pressure is real but readable. Trade-off: adviser answers must compress to seconds of real time; delays are expressed in sim-time and rendered as such in Hebrew.
