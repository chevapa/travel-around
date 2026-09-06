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
  // issue #77/#79: this test originally asserted #map's visibility right
  // after goto() with no screen switch — true on desktop (map is the
  // default screen there), but on a mobile viewport the app starts on the
  // recommend screen instead (see recommend.js's own isMobile check) and
  // #map sits hidden inside the other screen, so this failed the instant
  // "Add autotests on mobile" (#77) actually ran it against a phone-sized
  // viewport for the first time. Switching explicitly first makes the
  // assertion true on both, rather than relying on whichever screen
  // happens to be the default for a given viewport.
  await page.locator('[data-screen="map"]').first().click();
  // Leaflet puts the leaflet-container class directly on #map itself
  // (the div passed to L.map()), not on a child element.
  await expect(page.locator('#map.leaflet-container')).toBeVisible();
  expect(errors, `console/page errors on load:\n${errors.join('\n')}`).toEqual([]);
});

test('main interactive button ("Куда?") opens the recommend screen', async ({ page }) => {
  await page.goto('/');
  // #open-recommend lives in the map screen's own toolbar — same mobile-
  // default-screen issue as above, see that test's comment.
  await page.locator('[data-screen="map"]').first().click();
  await page.locator('#open-recommend').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'recommend');
  await expect(page.locator('#reco-stack')).toBeVisible();
});

test('a place card is displayed with a name and basic info', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-screen="map"]').first().click();
  await page.locator('#open-recommend').click();

  const card = page.locator('.reco-card:not(.reco-empty)').first();
  await expect(card).toBeVisible({ timeout: 10000 });
  await expect(card.locator('.reco-name')).not.toBeEmpty();
  await expect(card.locator('.popup-badges')).toBeVisible();
});

// issue #77: explicitly requested — this exact case is what #75 found
// broken on a real phone (a tap target too small/unclearly positioned to
// hit) with zero automated coverage catching it first. Runs on both the
// Desktop Chrome and Mobile Chrome projects (playwright.config.js) since
// that's precisely the axis the bug was on.
test('atlas stats button opens the stats modal with a percentage headline', async ({ page }) => {
  await page.goto('/');
  // #open-stats lives in the map screen's hero-card — on the Mobile Chrome
  // project the app starts on the recommend screen (see recommend.js's
  // own isMobile check), so switch screens first, same as a real mobile
  // user would via the nav.
  await page.locator('[data-screen="map"]').first().click();
  await expect(page.locator('#open-stats')).toBeVisible();
  await page.locator('#open-stats').click();
  await expect(page.locator('#stats-back')).toHaveClass(/open/);
  await expect(page.locator('.stats-headline')).toContainText('%');
});
