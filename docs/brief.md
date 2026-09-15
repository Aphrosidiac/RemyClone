# Build brief — FF Shoots (FF Dev Studio portfolio, remyshoots.co.za clone)

## Identity

- **Product name:** FF Shoots — the FF Dev Studio portfolio site (working repo name `RemyClone`)
- **Owner / brand:** FF Dev Studio (Fakhrul)
- **Whose site is the reference?** a third party's (Remy Shoots, Johannesburg production studio).
  Per Fakhrul's explicit instruction for this local test: take and reuse their images and video
  as-is; they will be swapped before anything goes live. Only the branding changes.
- **Existing brand assets supplied?** none for this build — wordmark is the two-letter mark "FF®"
  set in the reference's own logo style (Helvetica Neue / Inter 600).
- **Tone of the product voice:** terse, technical, uppercase mono — unchanged from the reference.

## Reference

- **Reference URL(s):** https://www.remyshoots.co.za/ (canonical https://remy-shoots.vercel.app)
- **What specifically do we want from it:** the whole site, 1:1 visually and behaviourally.
- **Access:** public surface only (no auth exists).
- **Snapshot date:** 2026-09-15
- **Assets pulled to:** `docs/reference/2026-09-15/assets/` (manifest.tsv has the provenance);
  raw HTML + RSC payload + every JS/CSS chunk in `docs/reference/` and `docs/reference/next/`.

## Mode

- **Mode:** SITE (marketing/portfolio; no auth, state is session/local storage only)

## Scope line

- **In scope:**
  1. Landing: loader → slider / grid / list WebGL gallery with filters (works / stills / motion),
     tickers, meta slots, fisheye lens, sound, hand-gesture control (webcam), gesture tutorial,
     photo booth easter egg, mobile dial + mobile menu.
  2. Project pages (`/project/[slug]`): stills strip with zoom + next-project cell; motion
     player with scrubber, fullscreen, next-project end card; iris + view-transition navigation.
  3. About (`/about`) and 404, with the same chrome, entrance animations and gesture support.
  4. SEO surface: per-page metadata, OG image, sitemap, robots, JSON-LD.
- **Explicitly NOT building:**
  - Sanity CMS integration and the `/api/sanity-image` proxy — data is a static file, images
    are served from our origin.
  - Mux streaming / hls.js / mux-data analytics — videos are self-hosted mp4 from our origin.
  - Vercel Analytics / Speed Insights.
- **Parity target:** feature parity; brand strings swapped (RS → FF, RemyShoots → FF Dev Studio).
- **Deadline or demo date, if any:** none stated.

## Technical

- **Repo:** `~/Desktop/dev/RemyClone`, private, Fakhrul.
- **Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, three r185 +
  @react-three/fiber 9, GSAP, @mediapipe/tasks-vision. Same as the reference (measured from
  chunk contents: `data-engine="three.js r185"`, R3F `__r3f`, GSAP, mediapipe HandLandmarker).
- **Auth:** none. **Multi-tenancy:** none. **Data volume:** 21 projects, 136 images, 8 videos.
- **Integrations that must exist:** none.
- **Hosting target:** local only for now. **Domain:** n/a.

## Environment and safety

- **Is this environment safe to test in freely?** yes — local dev only.
- **Actions requiring confirmation before running:** any deploy.
- **Deployment:** none planned; approval required before any deploy; push to GitHub first.

## Deliverables

- `docs/brief.md` — this file
- `docs/reference-spec.md` — the measured spec
- `docs/reference/2026-09-15/` — snapshots, screenshots, assets, manifest
- `docs/qa-log.md` — verification narrative
- `docs/parity.json` + `docs/parity.md` — the countable ledger

## Gates

- [x] **Gate 1** — spec + token set (Fakhrul said "no questions asked, proceed"; recorded, not blocking)
- [x] **Gate 2** — landing slider at 1440/390: diff 0.22 / 0.06 mean vs reference
- [x] **Gate 3** — every route + flow verified against the reference with `tools/verify.mjs`
- [x] **Gate 4** — `docs/qa-log.md`, `docs/parity.md` (31/34 complete; booth partial, CMS + Mux omitted by brief)
