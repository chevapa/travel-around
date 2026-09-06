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
  // issue #77/#79: every real mobile-layout bug found this session (#75's
  // clipped stats button, #17's badge-clipping/toast-overlap) was found by
  // hand, after the fact, against a mobile viewport nobody was running
  // automated checks against — desktop-only smoke tests can't catch a
  // mobile-only layout regression. Both projects run every spec in
  // tests-e2e/ (see smoke.spec.js's own new "atlas stats" case), so a
  // regression on either surface fails CI instead of waiting for a human
  // to notice on a real phone. Manual viewport/isMobile/hasTouch here
  // (rather than Playwright's devices['iPhone 13'] preset) because that
  // preset assumes its own bundled Chromium build, which this config
  // deliberately doesn't use — see the comment above.
  projects: [
    {
      name: 'Desktop Chrome',
      use: { viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'Mobile Chrome',
      use: {
        viewport: { width: 390, height: 844 }, // iPhone 12/13/14-class width
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
  ],
  webServer: {
    // Plain static file server — no extra npm dependency for something
    // python3 (already required by scripts/validate-vocab.mjs's siblings
    // in this repo's tooling) does out of the box.
    command: 'python3 -m http.server 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
