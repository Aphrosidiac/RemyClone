# FF Shoots — a demo recreation of remyshoots.co.za

> **Disclaimer.** This is a recreation of [remyshoots.co.za](https://www.remyshoots.co.za/),
> built by FF Dev Studio as a technical demo. All photography, films, client marks and copy
> belong to Remy Shoots. It is not a live site and is not affiliated with or endorsed by
> Remy Shoots. The same disclaimer is shown on the entry screen of the site itself.

Next.js 16 + React 19 + three r185 / R3F 9 + GSAP + MediaPipe, rebuilt behaviour-for-behaviour
from the public site (see `docs/reference-spec.md` for what was measured).

Live demo: **https://ff-shoots.pages.dev**

```bash
npm install
npm run dev              # http://localhost:3150
npm run build            # static export → out/
npm run deploy           # upload out/ to Cloudflare Pages (needs the FF .env; see scripts/deploy.sh)
npm run deploy:preview   # same build on a preview branch, production untouched
```

- `docs/brief.md` — scope, identity, what is deliberately not built
- `docs/reference-spec.md` — the measured spec (tokens, motion, breakpoints, provenance)
- `docs/qa-log.md`, `docs/parity.md` — how it was verified and what is done / partial / omitted
- `tools/` — `capture.mjs` (screenshots per state), `capture2.mjs` (interaction states),
  `verify.mjs` (flow verifier, run on both sites), `diff.py` (numeric screenshot diff),
  `og.mjs` / `icons.mjs` (brand images)

Imagery and films are Remy Shoots' — shown here under the disclaimer above, for the demo only.
