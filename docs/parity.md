# Parity ledger

**31/34 complete** — 30 done, 1 partial, 2 omitted, 1 improved

## 404

| ID | Feature | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| NF-01 | Not-found page with chrome, reveal, go home pill | done | notfound diff 0.18; verify status 404 + text + ready |  |

## about

| ID | Feature | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| STU-01 | Studio page: hero, 3-line headline reveal, rail columns, footer socials incl. email copy roll | done | about diff 0.18@1440 0.25@390 0.07@1920; verify headline/cols/footer identical |  |
| STU-02 | Nav drop hover, filter links carry to home, back button → iris home | done | verify dropOpen/homeUrl/homeFilter/homeMetaType |  |

## landing

| ID | Feature | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| LND-01 | Loader: title/copy reveal, % + playhead + tick fill, enter with/without sound | done | verify.mjs loaderReadyMs/pct/loaderGone; capture loader-ready/hover diff 1.66 (brand text only) |  |
| LND-02 | Slider view: WebGL strip, centre colour / inactive grey 50%, parallax, drag+flick, wheel, arrow keys | done | slider diff 0.22@1440 0.06@390 0.21@1920 0.19@820; verify meta after right/left/wheel/drag identical |  |
| LND-03 | Slider intro (park 3×visibleW, settle, ticks) and ticker (41 groups, names roll in) | done | verify tickName; capture slider; fps probe shows same idle→never sequence |  |
| LND-04 | Grid view: build-in bands, zoom .75, 4 edge rails, drag/wheel/arrows | done | grid diff 0.20@1440; verify gridClass/gridTickers [19,19,13,13]/arrow step identical |  |
| LND-05 | List view: slider rotated vertical, side rails with names, caret at --vcaret-x | done | list diff 0.23; verify listRails 26, listCaretX 339, arrow step identical |  |
| LND-06 | View morphs slider↔grid↔list with stage handoff, locks, 1.6s ease | done | verify morphClass→gridClass→listClass→sliderAgain; capture2 grid-motion timing explained |  |
| LND-07 | Filters works/stills/motion with fade-out/in, meta roll, sliding nav caret | done | verify filterMeta/filterCurrent/filterNavCaretX/tickTypes/motionMeta/worksMeta identical |  |
| LND-08 | Meta slots index/name/type/tag, shown only outside slider | done | verify meta + metaOpacityInSlider (y 39.9) + metaTransformInGrid (0) |  |
| LND-09 | Motion preview: centre motion tile plays 10s window of its film | done | verify previewVideo paused:false t:18 (reference cannot decode HLS headlessly) | self-hosted mp4 instead of Mux HLS |
| LND-10 | Fisheye lens: cube capture + mirror-sphere shader, vignette, 1.6s morph, sessionStorage | done | fisheye-1440 probe screenshots match by eye; verify lens label/aria/vignette | tween progress under SwiftShader jitters on both sides |
| LND-11 | Sound toggle + tick/shutter/print audio, sessionless unlock | done | verify sound label; audio graph re-implemented from module 76569 (not audible headlessly) |  |
| LND-12 | Trusted badge logo rotation (14 clients) | done | capture shows rotating logos; timing 0.5/1.4/0.5 from module 81941 |  |
| LND-13 | Hand gestures: MediaPipe from own origin, roll-out/loading/preview states, cursor + hints, tutorial | done | probe3 with fake camera: state sequence, 200s for wasm/model, tutorial steps, cursor hint; gestures diff 0.21 | pinch/grab with a real hand not exercised |
| LND-14 | Photo booth (frame gesture → countdown → print → download) | partial | code path re-implemented 1:1 from module 55261; not triggered without a real hand | needs manual test with a webcam |
| LND-15 | Tap/Enter on centre opens project through the iris | done | verify irisDuringNav block / irisAfter none / projectUrl |  |
| LND-16 | Mobile: dial, menu button + overlay with blur, hidden chrome, sound centred | done | slider-390 diff 0.06, menu-open-390 0.30; verify mobile dial/hidden/menu/filter/drag |  |
| LND-17 | Tablet 761–900: nav column, tagline hidden, vcaret shift | done | slider-820 diff 0.19, grid 0.24, list 0.35 |  |
| LND-18 | Session: skip loader on return, iris-nav arrival, ?filter= pre-applied | done | verify homeLoader false after works link; about filter link → homeFilter stills |  |

## project

| ID | Feature | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| PRJ-01 | Stills strip: natural-aspect cells at zoom, parallax objectPosition, drag/flick/wheel/arrows, tick scrubber, count | done | project-stills diff 0.06/0.16/0.05; verify cells/count/head identical |  |
| PRJ-02 | Zoom (VIEW_MOVE_S), zoom hints prev/next/zoom in/out, Escape | done | project-zoomed diff 0.00 (control-checked comparator); verify zoomed/zoomCell/zoomBtn/unzoomed |  |
| PRJ-03 | Next-project cell + pull-past-end + ArrowRight → View Transition slide; back → slide back | done | verify nextUrl/nextTitle/backUrl; next-of-kind fixed after ref comparison | native startViewTransition with types instead of React ViewTransition |
| PRJ-04 | Motion player: poster, click to play hint, idle chrome after 5s, scrubber, fullscreen, sound, end card | done | project-motion diff 0.05; verify video/playHint/fullscreen/endCard; motion-end capture shows end card | mp4 from own origin |
| PRJ-05 | Header nav with works drop (hover reveal), sliding caret, about/contact; iris back home / about | done | project-nav-drop diff 0.06; verify homeUrl/homeClass, aboutUrl |  |
| PRJ-06 | Mobile project: menu button, strip inset 96/120, hints hidden | done | project-stills-390 0.16, project-menu-390 0.02; verify projectMenu/stripInset |  |
| PRJ-07 | Per-project metadata (title, description, canonical, OG image) | done | next build 21 SSG pages; generateMetadata mirrors reference description pattern |  |

## site

| ID | Feature | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| A11Y-01 | prefers-reduced-motion honoured (entrances, rolls, view transitions, booth, hand) | done | same media queries as reference CSS + JS guards; not captured |  |
| DEV-01 | Brand: RS→FF, RemyShoots→FF Dev Studio, contact, socials, credit; loader copy = ownership disclaimer | improved | verify chromeText[0] FF®; loader renders 3 disclaimer lines (Chrome 2026-09-16); metadata description | published as a demo recreation; all other copy and media credited to Remy Shoots |
| OMIT-01 | Sanity CMS + /api/sanity-image proxy | omitted | per brief | static data file |
| OMIT-02 | Mux streaming / hls.js / mux-data, Vercel analytics | omitted | per brief | self-hosted mp4 |
| SEO-01 | Metadata, OG card, favicon/apple icon, sitemap, robots, JSON-LD | done | next build lists /sitemap.xml /robots.txt /opengraph-image; icons rendered with site fonts | OG rendered as static PNG (Satori rejected the subset woff2/ttf) |
| SEO-02 | Fonts self-hosted with the reference's unicode-range subsets + metric fallbacks | done | app/fonts.css; text diffs ≤0.3 across widths |  |

