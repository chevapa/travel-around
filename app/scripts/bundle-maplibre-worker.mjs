#!/usr/bin/env node
// MapLibre GL's worker file (node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs)
// is not self-contained: it does `import ... from "./maplibre-gl-shared.mjs"`,
// a relative import to a sibling file in the SAME node_modules/maplibre-gl/dist/
// directory. That's fine when the worker is loaded from its original location,
// but MapBase.tsx has to hand maplibre-gl an explicit worker URL (see its own
// comment for why — Vite inlines maplibre-gl into the main app bundle, so the
// library's own default `import.meta.url`-relative worker lookup resolves to
// the WRONG place). A plain Vite `?url` import of maplibre-gl-worker.mjs alone
// copies just that one file — its `./maplibre-gl-shared.mjs` import then 404s
// inside the worker thread, which fails SILENTLY (no console output on the
// main thread at all): the map's "load" event simply never fires, so every
// bit of chrome gated on it (TopBar, Legend, cards) never renders either.
//
// Fix: flatten the worker and its one dependency into a single, dependency-free
// file ourselves at build time, via esbuild (already present — it's Vite's own
// bundler). MapBase.tsx then does a plain `?url` import of THIS generated file
// instead of the original two-file pair.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, "../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs");
const outfile = path.join(here, "../src/vendor/maplibre-gl-worker.bundled.mjs");

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: true,
  legalComments: "none",
});

console.log(`[bundle-maplibre-worker] wrote ${path.relative(process.cwd(), outfile)}`);
