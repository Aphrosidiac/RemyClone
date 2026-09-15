# FF Shoots

FF Dev Studio's portfolio site — a 1:1 rebuild of [remyshoots.co.za](https://www.remyshoots.co.za/)
under our own mark. Next.js 16 + React 19 + three r185 / R3F 9 + GSAP + MediaPipe.

```bash
npm install
npm run dev        # http://localhost:3150
npm run build && npm start
```

- `docs/brief.md` — scope, identity, what is deliberately not built
- `docs/reference-spec.md` — the measured spec (tokens, motion, breakpoints, provenance)
- `docs/qa-log.md`, `docs/parity.md` — how it was verified and what is done / partial / omitted
- `tools/` — `capture.mjs` (screenshots per state), `capture2.mjs` (interaction states),
  `verify.mjs` (flow verifier, run on both sites), `diff.py` (numeric screenshot diff),
  `og.mjs` / `icons.mjs` (brand images)

Imagery and films are the reference's, reused for this local test only (see brief).
