# Reference spec — remyshoots.co.za → FF Shoots

Provenance markers: `[measured]` extracted from the page / stylesheet / shipped JS,
`[observed]` seen in a real render, `[inferred]` reasoning.

The reference ships one un-hashed stylesheet (`docs/reference/home.css`, 3761 lines, class
names readable) and readable Turbopack chunks (`docs/reference/next/pretty/`). Every number
below is therefore `[measured]` unless marked. The full stylesheet is the token source; this
file records the structure and the numbers a rebuild must not get wrong.

## 1. Snapshot

- URL https://www.remyshoots.co.za/ (canonical remy-shoots.vercel.app), 2026-09-15.
- Captured at 1440×900 and 390×844 via headless Chromium (SwiftShader WebGL) —
  `docs/reference/2026-09-15/shots/`. In-app Browser pane also used at 1440×900.
- No A/B variant seen. Next.js 16 / Turbopack, React 19, three r185, R3F 9, GSAP, hls.js,
  mux-video-react 0.31, @mediapipe/tasks-vision, Vercel Analytics. `[measured]`

## 2. Sitemap `[measured]` (sitemap.xml)

| Route | Template | Notes |
|---|---|---|
| `/` | Landing | client-rendered gallery; `?filter=stills|motion` pre-applies a filter |
| `/about` | Studio | static, full-bleed hero photo |
| `/project/[slug]` | Detail | 21 slugs; stills strip or motion player |
| 404 | NotFound | `nf-*` classes |
| `/api/sanity-image` | image proxy | not rebuilt — images served locally |
| `robots.txt`, `sitemap.xml`, `opengraph-image.png`, `favicon.ico`, `apple-icon.png` | | |

## 3. Page anatomy

**Landing** (`.landing.view-{slider|grid|list}.chrome-{…}[.gestures-on][.is-ready][.is-menu-open][.is-morphing][.is-booth-open]`):
`.slider-view` / `.grid-view` / `.list-view` (R3F canvas + DOM overlay: `.dial`, `.ticker`,
`.gticker×4`, `.vticker×2`) → `header.chrome` (logo, tagline, `nav.nav-right`) →
`.menu-btn` + `.mobile-menu` (≤760) → `.meta-slot` ×4 (index / name / type / tag) →
`.view-toggle` (desktop) → `.trusted` (rotating client logo badge + fisheye toggle) →
`.sound-toggle` → `.hand-control` (webcam gesture) → booth → gesture cursor →
gesture tutorial → `.loader` (until entered).

**Detail** (`.project-page > .detail[.is-motion]`): `.detail-hero.detail-strip` (N `.detail-cell`
+ `.detail-cell.detail-next`) or `.detail-hero.detail-video` + `.detail-next-end`; `.detail-chrome`
(header: logo / title+client / nav; footer: zoom|fullscreen button, `.detail-ticker` with
count + 41 tick groups + playhead, controls: sound, gestures); `.detail-close-zoom`; mobile
menu; play/zoom hint.

**Studio** (`.studio`): `.studio-bg` (cover image, 54% center, #00000042 scrim) → chrome →
`main.studio-main` (`h1.studio-headline` 3 masked lines, `.studio-rail` with about / services /
featured clients columns, `.studio-trusted` (mobile), `footer.studio-footer`).

**NotFound** (`.notfound`): chrome → `.nf-block` (404 / message / go-home pill) → trusted → sound.

## 4. Component inventory

- **Roll label** (`.roll > .roll-inner > .roll-face×2`): hover slides inner −100% in 0.45s
  cubic-bezier(.4,0,.15,1); second face optionally different text (`menu`→`close`,
  `email`→`Copied`). Mobile: on `:active` / `.is-rolling` (450ms timer) instead of hover.
- **Reveal mask** (`.reveal-mask > [data-reveal=line]`): entrance from yPercent 110 → 0,
  0.9s power3.out (GSAP). `[data-reveal=chrome|block|foot]`: opacity 0 + y 28 → 1/0.
- **Haptic switch**: hidden checkbox inside every link/button; on ≤760 it covers the control
  and `navigator.vibrate(8)` fires on change (30ms debounce).
- **Sliding caret**: red triangle `.nav-site-caret` (0.9em, clip-path polygon(100% 50%,25% 6.7%,25% 93.3%))
  slides to hovered nav item (0.35s power3.out, tick sound on change); `.toggle-caret` 16px
  under the active view label (top: 100% + 8px). Placement mode "before": caret sits left of
  the item, at max(prevRight+4, itemLeft−8−caretW).
- **Trusted badge**: 115×64 box with 0.75rem cream corner ticks (8 linear-gradient
  backgrounds) on #00000040; logo cycles 14 clients: fade in 0.5s, hold 1.4s, out 0.5s.
- **Buttons**: `.loader-enter` red pill (padding 12px 26px, radius 999, scale 1.04 on hover);
  `.nf-home`, `.booth-download` red pills; every chrome control is text-only mono.
- **Mobile menu**: `.menu-btn` top 23 right 16, 18px; overlay `.mobile-menu` fades 0.16s,
  siblings blur(6px) + opacity .5; items 18px right-aligned, gap 12, red caret left of current.
- **Gesture cursor**: fixed, 24px hand svg (open/closed/point/arrow), hint chip
  `.cursor-hint` (12px, backdrop blur .75rem, cream corner ticks .5rem) at (2rem, 0).
- **Gesture tutorial**: 560px dialog, 1px #2e2e2e border, 18px padding, 2200/1560 stage,
  3 steps with looping clip ranges (8.5–11s, 0.4–3s, 4–8s), dots 22×2.
- **Photo booth**: countdown 3→1 (booth-num 95px red), flash, 518/701 print card with
  3D tilt (rotationY ±11° + drag), photo filter chain, download 1036×1402 png.

## 5. Design tokens `[measured]`

```css
:root{--cream:#fcf8ef;--gray-150:#cbc7c2;--gray-200:#b2aeab;--red:#ff3131;--panel:#2e2e2e;--bg:#111;
      --stage-lift:24px;--vcaret-x:calc(8.33vw + 219px);--nav-caret-lane:28px;--nav-caret-gap:8px;--nav-caret-size:.9em;
      --vig-size:45%;--vig-radius:min(114vh,114vw);--vig-open:1.2}
body{background:#111;color:#cbc7c2;font:600 16px/1.2 "Roboto Mono";text-transform:uppercase;-webkit-font-smoothing:antialiased}
```
- Type: mono UI `clamp(13px, 1.05vw, 18px)` / 1.2 / letter-spacing −0.02em (view toggle −0.04em).
  Logo `clamp(22px,1.69vw,30px)` Helvetica Neue→Inter 600, line-height .88, sup .64em.
  Loader title `clamp(44px,6.5vw,112px)` Inter 800 −0.03em red, sup .45em. Loader copy
  `clamp(12px,.93vw,16px)`/1.55 #8e8c87. Studio headline `clamp(32px,5vw,86px)` Inter 600
  −0.015em white. 404 code `clamp(56px,6.13vw,95px)` Inter 800 −0.04em red. Next-name
  `clamp(30px,4.4vw,68px)`. Menu 18px. Dial 14px.
- Fonts: Inter 600/800, Roboto Mono 500/600 (Google via next/font, unicode-range subsets);
  fallbacks Arial with size-adjust 107.12% (Inter) / 134.61% (Roboto Mono).
- Chrome inset 40px (20px ≤760). Tagline left `calc(8.33vw − 5px)`; nav-right left
  `calc(75vw − 42px)`, gap 20, filters padded 28 for the caret lane, drop gap 4.
- Meta slots: index left 39; name left `calc(8.33% + 35px)` (max-width to vcaret); type left
  `calc(75% − 4px)`; tag left `calc(91.67% + 7px)`. Trusted bottom 40 left 40; sound bottom 52
  left `calc(75% − 2px)`; hand-control bottom 40 right 40. View toggle top 39 centred gap 8.
- Ticker: strip height `clamp(59px,4.86vw,97px)`, groups 7 ticks, pitch 100px × tickScale
  (`clamp(.7, vw/1728, 1.15)`), tick 1px #ffffff40, active red, group width 84+22·m,
  tick heights 12+4·m (centre 32). Grid tickers 20px lanes on every edge. List tickers
  retract 64px when inactive; caret at `--vcaret-x`.
- Detail: strip inset 128/0/132 (96/120 ≤760); video inset 88/40/108 (0 when motion);
  header top 27; footer h 104; controls bottom 56 gap 40; count top 16, rule 20×1.
- Studio: main padding-top `clamp(88px,11vw,123px)`; rail min-height 340, columns at
  33.33%+21px / 58.33%+7px, about width min(425px,…); footer bottom `clamp(24px,2.3vw,40px)`;
  four socials absolutely placed at 33.33%+21 / 41.67%+15 / 50%+11 / 58.33%+7 (≥1101px).
- Radii: pills 999/1000px only. Shadows: booth card `0 34px 55px -18px #00000073, 0 10px 20px -10px #0000004d`.
- Breakpoints: 760 (compact), 761–900 (tablet nav column), 901 (gestures supported), 1100
  (studio columns), 1101.

## 6. Motion spec `[measured from JS]`

- Loader: lines in 0.9s power3.out; percentage = min(elapsed/2s, loaded+0.5) eased
  `1−e^(−dt·7/1000)`; playhead translates with %; ticks fill red left of head; on enter:
  lines out yPercent −110 0.8s power3.in, actions fade 0.4, bg → transparent 0.9 power2.inOut.
- Page entrance (`playPageEntrance`): lines yPercent 110→0, chrome/blocks/foot opacity 0 y28
  → 1, all 0.9s power3.out, once per route per session (`rs-entrance-<route>` in sessionStorage).
- Slider intro: cells park 3×visibleW right and settle with `x += (0−x)(1−e^(−4dt))`, tick on
  each cell passed, hold 250ms; ticker lines roll in 1.3s power3.out.
- Slider sim: `pos += (target−pos)·(1−e^(−dt·7))`; drag gain 2.2 (2.6 ≤760), wheel 0.0016/px
  clamped ±140, flick commit 0.1 cell, settle after 120ms (wheel 160ms). Inactive cells
  opacity .5 saturation 0 (`INACTIVE_OPACITY .5`, `INACTIVE_SAT 0`), parallax UV scale .88,
  max .12. Cell size: `min(587.67/1728·visibleW·lens·1.15·1.4916, .72·visibleH·lens)`,
  ratio 758/1116; ≤760 cell fills visibleH.
- View morph: 1.6s `VIEW_MOVE_EASE` (in-out sextic); grid zoom .75 (.81·.75 with gestures);
  grid build bands offset 0.08s per row; list = slider rotated 90°.
- Filter change: FILTER_ENTER_S 1.6 (fade out .8 / in .8); meta lines roll out/in 0.45s
  cubic-bezier(.4,0,.15,1) ±110%.
- Fisheye: cube-camera re-render, lens amount tween 1.6s, vignette scale 1+(1−a)·1.2.
- Iris navigation: radial-gradient mask r 165→0 0.6s power2.in, route push, 0.8s power2.out
  open after `iris-page-ready`, `iris-opening` fired at 0.88·HANDOFF(0.6).
- Project→project: View Transition `project-slide` (stage ±100vw 1.6s cubic-bezier(.887,0,.113,1),
  meta ±100% 0.45s), cross types wipe the sheet (1s) / hold (1.6s).
- Detail stills: cells laid out by natural aspect at zoom; zoom tween VIEW_MOVE_S; idle hides
  chrome after 5s on motion; next-project end card slides in 0.7s when video ends.
- Hover rolls 0.45s; colour transitions 0.2–0.3s; chrome dims to .25 while dragging.

## 7. Content model `[measured]` (RSC payload → `docs/reference/projects.json`)

Project: `name, slug, image, alt, type: stills|motion, count, tag, gallery[], clients[],
previewStart?, playbackId?, duration?`. 21 projects: 13 stills / 8 motion. Tags: Events,
Editorial, Campaign, Lifestyle, Social Media. Meta label: `stills[N]` or `motion[mm:ss]`.
Index label `01.` = position in the current filter. Client line `Client: A X B` (max 2).

## 8. Responsive `[measured]`

≤760: tagline / meta type+tag / ticker / trusted / nav-right hidden; view toggle not rendered
(slider only); dial shown (412 disc, 459 wheel at bottom −312, 72 ticks every 5°, majors at
60°, rotate −60°/cell); menu button + overlay; sound centred bottom 24; detail nav → menu;
studio stacks (services grid 121px col). 761–900: nav-right becomes a right column (103px),
tagline hidden, vcaret-x 8.33vw+123. ≥901 + getUserMedia: gestures control rendered.

## 9. SEO & social `[measured]`

Title `Remy Shoots` / `<name> — Remy Shoots` / `About — Remy Shoots` / `404 — Remy Shoots`.
Description per project: `<name> — an <tag> shoot for <client>. N frames by …` / `… film … N
seconds by …`. OG image 1200×630 png, twitter summary_large_image, locale en_ZA, canonical per
page, JSON-LD Organization. robots allows all except /api/. Sitemap lists /, /about, 21 projects.

## 10. Performance `[observed]`

Ours is a full static export (`output: "export"`, 21 SSG project pages, `404.html`) served from
Cloudflare Pages with immutable caching on `/videos`, `/images/projects`, `/fonts`. Pages caps
files at 25 MiB, so the 720p renditions are what ship (one re-encoded to 20.7 MB).

Static-first SSR shell (chrome + loader render server-side; gallery bails to CSR). Fonts
preloaded (2 woff2). Images: 1600w webp q80 via proxy (we serve the same bytes locally).
Videos: HLS 1080p; ours: mp4 (see brief). WebGL canvas dpr [1,2], frameloop `never` when idle
(`useIdleFrameloop`: sleeps 400ms after motion stops, 2s grace on wake).

## 11. Accessibility `[measured]`

Landmarks: header/nav[aria-label=Primary]/main (studio only). Gallery canvas has no text
alternative (reference defect — we add a visually-hidden list of works `[improved]`).
Focus-visible: browser default only. prefers-reduced-motion respected across GSAP entrances,
rolls, view transitions, booth. Decorative imgs alt="". Haptic checkboxes aria-hidden.

## 12. Provenance

This build is published as a **demo recreation with a disclaimer** (the loader copy, read
before entering, and the site description): all assets and copy remain Remy Shoots' property,
the site is not live and not affiliated. Taken from the reference and shipping in the demo: 136 project webp,
8 Mux films (re-muxed to mp4), Mux poster thumbnails, studio hero jpg, 14 client logo svgs,
hand/cursor/playhead svgs, tick.mp3, 3 gesture tutorial mp4, carousel fallbacks, mediapipe
wasm + model, favicon/apple-icon/og png. Replaced: wordmark RS→FF, RemyShoots→FF Dev Studio,
contact email, social hrefs, site credit, JSON-LD identity, loader copy (now the disclaimer),
meta descriptions. Copy otherwise unchanged and credited to Remy Shoots by the disclaimer. Code: behaviour re-implemented in TypeScript from the
shipped chunks; the stylesheet is reproduced verbatim where it is pure layout (class names kept
so the token diff is 1:1).
