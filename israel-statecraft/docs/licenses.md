# Asset & Dependency License Manifest

## Map and visual assets

| asset | origin | license |
|---|---|---|
| Regional map geometry (`scenarios/swords-of-iron/regions.ts`) | original, hand-authored for this project | project-internal (no external rights) |
| All UI layout, CSS, palettes | original | project-internal |
| Icons | Unicode emoji rendered by system fonts | no asset license required |
| Fonts | system font stack (Segoe UI / Heebo / Arial Hebrew) | OS-licensed, not distributed |
| Hebrew/Arabic/Persian/Turkish/Russian/Chinese prompt texts | authored (package worldview + this project) | project-internal |

No third-party game artwork, photographs, tiles, or GIS datasets are included.

## Runtime dependencies (production)

| package | license |
|---|---|
| react, react-dom | MIT |
| ws | MIT |
| tsx | MIT |
| cross-env | MIT |

## Development dependencies

| package | license |
|---|---|
| typescript | Apache-2.0 |
| vite, @vitejs/plugin-react | MIT |
| vitest | MIT |
| puppeteer-core (screenshots only) | Apache-2.0 |
| @types/* | MIT |

No GPL/AGPL dependencies. Research source URLs and their usage constraints are listed in `research/verified/source_verification.md` and the package's `initial_source_manifest.csv`; no source content is redistributed in this repository beyond short factual data points.
