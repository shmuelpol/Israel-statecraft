# ADR 0002 — Original stylized SVG geography instead of GIS datasets

**Decision.** The map is original, hand-authored simplified polygon geometry (lon/lat, equirectangular projection) rendered as SVG with composable overlays.

**Alternatives.** Natural Earth / OSM extracts — rejected: (a) admin-0 datasets separate the Golan from Israel, so satisfying the closed product decision (Golan continuous, no special styling) would require geometry surgery anyway; (b) heavier tooling (topojson, d3-geo) for no gameplay gain; (c) tile services violate "runs locally, no key".

**Consequences.** Fully license-free (original work); geometry is game data, so extreme territorial states (multi-front collapse, deep occupation, buffers, international zones) are first-class states, not artwork. Trade-off: coastlines are stylized, matching the intended "lightly illustrated" look.
