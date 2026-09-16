# QA log — FF Shoots

Instruments: headless Chromium 1243 (SwiftShader WebGL, h264 decodes) via `tools/capture.mjs`,
`tools/capture2.mjs`, `tools/verify.mjs`; numeric screenshot diff `tools/diff.py` (mean abs
difference 0–255, and % of sampled pixels differing by >24); real Chrome via the Chrome MCP for
server/codec checks. The reference was captured with the same scripts on the same day so the two
sides share every instrument bias. Control check: slider-vs-grid diff = 38.6 mean, so a 0.2 mean
is a real match, not a broken comparator.

## 2026-09-15/16 — visual pass 1 (static states, 1440×900 + 390×844)

| state | 1440 mean | 390 mean | note |
|---|---|---|---|
| loader | 2.23 | 2.82 | brand text differs by design (REMYSHOOTS → FF DEV STUDIO) |
| slider | 0.22 | 0.06 | |
| slider (stills filter) | 0.28 | 0.06 | |
| grid | 0.20 | n/a | |
| list | 0.23 | n/a | |
| project stills (+hover) | 0.06 | 0.16 | |
| project motion | 0.05 | 0.17 | |
| about | 2.04 → 0.18 | 0.25 | first run served the hero as the original jpg; reference uses next/image (webp q75) — switched to next/image, diff gone |
| 404 | 0.18 | 0.36 | |

## visual pass 2 (interaction states)

nav hover roll 0.18 · toggle hover 0.18 · filter=motion meta 0.21 · loader hover 1.66 (brand) ·
project nav drop 0.06 · project zoomed 0.00 · zoomed next-hint 0.00 · project end (next cell) 0.07
· about nav drop 0.21 · about email hover 0.20 · mobile menu open 0.30 · mobile filter 0.23 ·
mobile project menu 0.02 · fisheye on 1440 (probe) matches by eye · gesture tutorial 0.21 (fake
camera). Large diffs explained: `grid-motion` and `iris-mid` and `project-from-iris` — the
reference in that headless run was still mid-morph (locked) so its Enter press was ignored and
its grid showed the pre-filter content; both sides run 1–5 fps under SwiftShader during morphs.
`motion-end` 28 — same end card, video looped to a different frame.

## visual pass 3 (widths 1920 / 1024 / 820 / 768 / 320)

All static states ≤0.5 mean except: grid/list/slider at 1920 in the *dev* server were caught
mid-intro (1–5 fps under SwiftShader); production build (`next start`) at 1920: slider 0.21,
project 0.05, about 0.08, grid/list captured mid-build on the *reference* side that time.
about-320 was 23.85: our headline wrapper made every line `:first-child` → nowrap; fixed by
using Fragments like the reference → residual is the entrance tail. loader-320 6.4: our
two-word brand wraps where the reference's single word overflows the viewport (reference
defect; kept the wrap).

## functional pass (`tools/verify.mjs`, both sites, JSON diffed)

Identical on: loader %, entered classes, meta slots, ticker names, canvas r185, idle frameloop,
chrome labels, toggle/nav caret x, arrow-key steps, wheel, drag+flick, grid morph classes and
rail counts, grid/list arrow steps, list caret x (339), filter labels + meta + caret, motion
preview video, works reset, sound label, iris layer during/after nav, project url + title,
stills count/cells/next cell, zoom class + zoomed cell size + button label, escape unzoom,
end-of-strip → next project url/title, back → previous, works link → iris home without loader,
motion class/count/video/poster/play hint/fullscreen toggle/end card, about → studio ready,
about headline transforms + column rects + footer positions + caret, nav drop hover open,
about filter link → home with stills applied, 404 status/text/ready, mobile dial/hidden
chrome/menu items/filter/drag/project menu/strip inset/about stack.
Differences: `RS®`→`FF®`; lens amount at 2.2s (both sides jitter under SwiftShader — the cube
render is heavy; the toggled state and vignette are correct on both); loaderReadyMs ours 3.2s
vs 2.7s on the dev server (image serving), 100% both.
Fixed from this pass: next project must be the next of the same kind (stills→stills,
motion→motion); nav label "About"; motion sheet keeps the poster until play.

## gestures + booth

Fake camera (`--use-fake-device-for-media-stream`): toggle rolls out → loading → live preview,
MediaPipe wasm + model served from our origin (200), tutorial 3 steps with clip ranges, cursor
hint "pinch to view" over the centre tile, preview click turns gestures off. Booth needs a
real hand making the frame gesture — not exercised; code path re-implemented from the
reference (countdown, capture, develop filter chain, print entrance, tilt, download card).

## real Chrome (extension)

Page loads with no console errors; server serves mp4 with ranges (206). The Chrome window was
hidden behind the desktop app, so rAF/timers/video were throttled there — loader stuck at 96%
until visible, video readyState 0. Instrument, not defect; the same page finishes in <3s and
plays video headlessly.

## build

`next build` clean (30 static pages incl. 21 projects, sitemap, robots, OG image); tsc clean;
eslint 0 errors (compiler-style ref/effect rules disabled by config — the gallery is
imperative by design, as the reference is).

## visual pass 3 (mid-interaction + reduced motion)

slider mid-drag (chrome dimmed to .25, "view project" caption) 15.6 — same state, tiles at a
different drag offset · stills mid-drag 6.6 (same) · motion play hint 0.05 · motion idle after
6s of playback 27.7 — same hidden-chrome state, different video frame · reduced-motion slider
0.07 / about 0.16 / project 0.06 · `?filter=motion` deep link 42.8 in the batch capture (our
filter fade caught at 0), re-probed: correct motion filter with the preview film playing.

## 2026-09-16 — disclaimer

Loader copy replaced by a three-line ownership disclaimer (lib/site.ts LOADER_COPY); meta
descriptions now say "demo recreation … belongs to Remy Shoots". Rendered in Chrome at
1568 wide: three centred lines under the title, reveal masks per line. Loader diff vs the
reference is now by design (title + copy).
