/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Relative base so the build works whether it's ultimately deployed at the
// repo root or nested under a path — that's still an open decision (see
// https://github.com/chevapa/travel-around/issues/84) since this app is
// being built alongside the live static site, not in place of it yet.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // MapLibre GL ships a web worker (for off-main-thread tile parsing)
  // whose own relative asset URL breaks once esbuild pre-bundles it into
  // a different location under node_modules/.vite/deps/ — the worker
  // 404s and the map silently falls back to no vector data at all. A
  // known Vite+MapLibre/Mapbox interaction; excluding it from
  // pre-bundling is the standard fix.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
