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
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});
