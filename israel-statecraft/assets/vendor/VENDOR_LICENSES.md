# Vendor Asset Licenses

All third-party assets bundled with this project, their sources, and licenses.
Fetched 2026-08-15. License policy: OFL / MIT / ISC / Apache-2.0 / CC0 only.

## Fonts (`fonts/`)

| File | Source URL | License | Verified by |
|---|---|---|---|
| `Rubik[wght].ttf` (variable, wght 300-900 incl. 400/600/700) | https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/Rubik%5Bwght%5D.ttf | SIL OFL 1.1 | `ofl/` directory of google/fonts repo + bundled `rubik-OFL.txt` |
| `rubik-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/rubik/OFL.txt | SIL OFL 1.1 (license text) | google/fonts repo |
| `Heebo[wght].ttf` (variable, wght 100-900 incl. 400/700) | https://raw.githubusercontent.com/google/fonts/main/ofl/heebo/Heebo%5Bwght%5D.ttf | SIL OFL 1.1 | `ofl/` directory of google/fonts repo + bundled `heebo-OFL.txt` |
| `heebo-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/heebo/OFL.txt | SIL OFL 1.1 (license text) | google/fonts repo |
| `SecularOne-Regular.ttf` | https://raw.githubusercontent.com/google/fonts/main/ofl/secularone/SecularOne-Regular.ttf | SIL OFL 1.1 | `ofl/` directory of google/fonts repo + bundled `secularone-OFL.txt` |
| `secularone-OFL.txt` | https://raw.githubusercontent.com/google/fonts/main/ofl/secularone/OFL.txt | SIL OFL 1.1 (license text) | google/fonts repo |

All three families support Hebrew. Variable TTFs cover the required 400/600/700 weights.

## Textures (`textures/`)

| File | Source URL | License | Verified by |
|---|---|---|---|
| `paper.jpg` (1024x600, subtle light paper grain, tileable) | https://ambientcg.com/get?file=Paper001_1K-JPG.zip (Color map, re-encoded JPEG q95 to fit size budget) | CC0 1.0 | https://ambientcg.com/a/Paper001 — page states assets are under the CC0 license, free to use without attribution incl. commercial |
| `carbon.jpg` (1024x1024, dark carbon-fiber weave, tileable) | https://ambientcg.com/get?file=Fabric004_1K-JPG.zip (Color map, unmodified) | CC0 1.0 | https://ambientcg.com/a/Fabric004 — page states assets are under the CC0 license, free to use without attribution incl. commercial |

## Icons (`icons/`)

18 SVG icons from Lucide: `shield`, `target`, `radar`, `satellite`, `rocket`,
`handshake`, `scale`, `siren`, `radio`, `globe`, `factory`, `landmark`, `users`,
`flame`, `anchor`, `plane`, `ship`, `crosshair`.

| File(s) | Source URL | License | Verified by |
|---|---|---|---|
| `<name>.svg` (18 files) | https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/&lt;name&gt;.svg | ISC | lucide-icons/lucide repo LICENSE (bundled as `LUCIDE-LICENSE.txt`) |
| `LUCIDE-LICENSE.txt` | https://raw.githubusercontent.com/lucide-icons/lucide/main/LICENSE | ISC (license text) | lucide-icons/lucide repo |

## Not obtained

Nothing was skipped; all requested artifacts were downloaded and validated
(TTF magic `0x00010000`, JPEG magic `FF D8 FF`, SVGs begin with `<svg`).

Note: `paper.jpg` is a lossless-source re-encode (JPEG quality 95) of the CC0
original to stay under the 300 KB budget; CC0 permits modification without
attribution. `Rubik[wght].ttf` and `Heebo[wght].ttf` are the variable-font
TTFs as shipped in the google/fonts repo.
