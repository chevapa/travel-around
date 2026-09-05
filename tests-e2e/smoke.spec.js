// Basic smoke tests (issue #7) — the three flows named in that issue,
// nothing more: page loads, the main "Куда?" button works, a place card
// displays. Driven by Playwright against the system's installed Chrome
// (see playwright.config.js) — no browser download, no new CI infra.
import { test, expect } from '@playwright/test';

test('page loads: map renders with no console errors', async ({ page }) => {
  // Only real JS errors count as "an obvious loading/init failure" — a
  // missing favicon.ico (this repo has none) is a routine browser request,
  // not an app bug. Chrome mirrors failed resource loads into the console
  // as an "error"-type message too (separate from the network layer), so
  // that specific, exact wording is filtered rather than ignoring all
  // console errors wholesale.
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      errors.push(msg.text());
    }
  });

  await page.goto('/');
  // Leaflet puts the leaflet-container class directly on #map itself
  // (the div passed to L.map()), not on a child element.
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
  expect(errors, `console/page errors on load:\n${errors.join('\n')}`).toEqual([]);
});

test('main interactive button ("Куда?") opens the recommend screen', async ({ page }) => {
  await page.goto('/');
  await page.locator('#open-recommend').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'recommend');
  await expect(page.locator('#reco-stack')).toBeVisible();
});

test('a place card is displayed with a name and basic info', async ({ page }) => {
  await page.goto('/');
  await page.locator('#open-recommend').click();

  const card = page.locator('.reco-card:not(.reco-empty)').first();
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card.locator('.reco-name')).not.toBeEmpty();
  await expect(card.locator('.popup-badges')).toBeVisible();
});
