# app/ — RISO1 rewrite

Vite + React + TypeScript. This is the RISO1 redesign (see `../DESIGN_RISO1/` and
`../DESIGN_RISO1/IMPLEMENTATION_PLAN.md`) being built alongside the live static site
(`../index.html`, `../js/`), which stays untouched and deployed until this app passes
Task 12's regression gate — see epic
[#84](https://github.com/chevapa/travel-around/issues/84).

## Commands

```
npm install
npm run dev        # local dev server
npm run build      # type-check + production build to dist/
npm run lint:hex   # fail if src/components/** hardcodes a hex colour instead of a token
```

## Status

Task 1 (scaffold + token pipeline) — done:

- `src/tokens/*.css` copied unchanged from `DESIGN_RISO1/tokens/`, except `fonts.css`,
  rewritten to self-hosted `@font-face` rules (`src/assets/fonts/*.woff2`, latin subset
  only — the product ships in English, see epic #84) instead of the Google Fonts CDN
  `@import`. The four `--font-*` variables are unchanged.
- `src/styles.css` is the one entry point, imported once in `src/main.tsx`.
- Real product assets only (`photo-stack`, `photo-beach`, `collage`, `collage2`) —
  not the design-review reference screenshots (`map.png`, `card.png`, `filters.png`,
  `ref-riso-map.webp`), which stay in `DESIGN_RISO1/assets/` and are never shipped.
- `npm run lint:hex` (wired into CI at `.github/workflows/riso1-app.yml`) fails the
  build on a raw hex colour anywhere under `src/components/**`.

Next: Task 2 (data model / `FrameState` union, issue #87) and Task 3 (core primitives,
issue #88) can proceed in parallel from here.
