# Visual Design Iteration Log — toward the reference level

Goal (product-owner directive): iterate until the game matches the refs' design level, in **two modes**:
- **Flash mode** (light theme, default) — ref 01 + 02: pastel illustrated map, type-colored rounded event cards with chunky borders, friendly icons, timeline strip.
- **חמ״ל mode** (new third theme) — ref 04 + 05: navy war-room chrome, cyan/amber accents, glowing markers, satellite-tinted land. *Note: the original spec barred this as the default aesthetic; the product owner now requests it as an optional mode. Default remains flash.*

## Gap analysis (iteration 1)

| Element | Refs | Current | Action |
|---|---|---|---|
| Event cards | type-colored pastels (red/yellow/blue/green), 2px dark borders, tinted title strip, bold outlined buttons (02) | uniform panel + thin urgency ribbon | ✅ it-1: type-tinted header strip + border + button styling |
| Hebrew typography | rounded geometric Hebrew (02 look) | Segoe UI system stack | ⏳ fetch agent: OFL webfonts (Rubik/Heebo/Secular One) |
| Map texture | illustrated paper feel (01/02); satellite dark (05) | flat fills | ✅ it-1: gradients+dashed foreign borders; ⏳ agent: CC0 paper/noise texture |
| Conflict markers | explosion stars at hotspots (02/05) | radial glow only | ✅ it-1: decorative hotspot markers |
| Timeline strip | top milestones + position marker + digital clock (02/05) | thin progress bar | ✅ it-1: hamal digital clock; ⏳ it-2: milestone ticks |
| חמ״ל theme | 05: navy chrome, cyan accent, amber alerts, glow | none | ✅ it-1: full third theme |
| Icons | flat consistent iconography | emoji | ⏳ agent: MIT/ISC SVG icon set (Lucide subset) |

## Requirements for the internet-fetch agent (dispatched, background)

Strict license policy: OFL / MIT / ISC / Apache-2.0 / CC0 **only** (no GPL, no CC-BY-NC), record source URL + license per artifact into `assets/vendor/VENDOR_LICENSES.md`.

1. **Hebrew webfonts** (woff2 + OFL.txt) → `assets/vendor/fonts/`: Rubik (400/600/700), Heebo (400/700), Secular One (400, display). Source: google/fonts GitHub raw or gwfh mirror.
2. **Subtle textures** (CC0, ≤80KB each, tileable) → `assets/vendor/textures/`: light paper/parchment grain; dark carbon/noise for חמ״ל.
3. **SVG icons** (MIT/ISC, single files) → `assets/vendor/icons/`: shield, target, radar, satellite, missile, tank, handshake, scale, siren, radio, globe, factory.
4. Verify every file downloaded is valid (non-HTML, plausible size), write the license manifest, list anything unobtainable.

## Iteration log

- **it-1 (this pass)**: type-colored flash cards, chunky borders/buttons, dashed foreign borders + hotspot markers, full חמ״ל theme (navy/cyan/amber + digital clock + glow), theme cycle button, screenshots of all three themes. Agent dispatched for fonts/textures/icons.
- **it-2 (next)**: integrate vendored fonts + textures + icons; timeline milestone ticks from fired anchors; card medallion icons; חמ״ל feed styling with circular sender icons (05); compare screenshots to refs again and iterate.

### it-1 results (screenshots 21/22)
- Flash: type-tinted card strips, chunky bordered buttons, dashed foreign borders, Israel emphasized, hotspot markers, front badges — clearly closer to refs 01/02.
- חמ״ל: full navy war-room theme with digital red clock, cyan accents, glow — matches ref 05 character without its clutter.
- Remaining for it-2: vendored Hebrew fonts, paper/carbon textures, SVG icon medallions (agent in flight), timeline milestone ticks, tighter card stacking.

### it-2 results (screenshot 23 + vendored assets)
- OFL fonts live: Rubik body, Secular One display. CC0 paper/carbon textures behind the grid. Lucide icons on front cards. Timeline milestone ticks added.
- FLASH NOSTALGIA layer (light only): glossy plastic buttons with bevel+outline, chunky brown panel borders with hard offset shadows, board-game map frame, glossy segmented bars — genuine 2005 browser-game feel.
- it-3 candidates: hamal feed circular sender icons (ref 05), lucide metric icons, further card-stagger tuning, wooden top timeline strip (ref 02).
