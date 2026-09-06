import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works whether it's ultimately deployed at the
// repo root or nested under a path — that's still an open decision (see
// https://github.com/chevapa/travel-around/issues/84) since this app is
// being built alongside the live static site, not in place of it yet.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
