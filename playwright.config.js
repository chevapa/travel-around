import { defineConfig } from '@playwright/test';

// Drives the system's already-installed Google Chrome (channel: 'chrome')
// instead of a Playwright-managed browser build — this repo has no other
// use for a downloaded Chromium, and the machine already has Chrome.
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 30000,
  use: {
    channel: 'chrome',
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    // Plain static file server — no extra npm dependency for something
    // python3 (already required by scripts/validate-vocab.mjs's siblings
    // in this repo's tooling) does out of the box.
    command: 'python3 -m http.server 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
