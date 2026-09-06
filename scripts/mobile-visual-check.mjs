#!/usr/bin/env node
// issue #79: "Implement mechanism on not to forget how does feature being
// developed looks like on mobile version... make robust checklist for pre
// commit, potentially done by ollama." See docs/mobile-checklist.md for
// the checklist this script is one part of.
//
// Screenshots the app's real screens at a phone viewport (via Playwright,
// same system-Chrome setup as tests-e2e/), then sends each to the local
// qwen3.5:9b vision model (same one suggest_alt_text.py already validated
// as producing accurate captions for this project, see EXPERIMENT-LOG.md)
// asking it to flag anything that looks visually broken — overlapping
// elements, text cut off by the viewport edge, controls that look like
// they'd collide.
//
// MEASURED, AND IT FAILED (see EXPERIMENT-LOG.md's v12 entry — the "measure,
// don't assume it works because it ran" rule this whole family follows):
// calibrated against two of THIS SESSION's own real, confirmed, already-
// fixed bugs (the #75 wrapped-text stats button, the #17 badge clipped by
// the sheet's close button) by feeding it the actual saved screenshots
// from before the fix. It said "looks fine" on BOTH. This is the same
// "default to no work" bias documented for clarify_issue.py, just on a
// vision task instead of a text one. The AI-verdict half of this script
// is kept only as a possible future re-test point, not something to trust
// — see the loud stdout warning below. What's actually reliable here is
// the screenshot capture itself: a human can eyeball 4 real mobile
// screenshots in a few seconds, which is most of this script's real value
// regardless of what the model says about them.
//
// Usage: node scripts/mobile-visual-check.mjs
// Requires the dev server running at http://localhost:4173 (same as
// tests-e2e/ — `python3 -m http.server 4173` from the repo root).

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = process.env.MOBILE_CHECK_URL || 'http://localhost:4173';
const OUT_DIR = 'test-results/mobile-visual-check'; // already .gitignored (test-results/)
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'qwen3.5:9b';
const TIMEOUT_MS = 60000;
const PROMPT =
  'This is a screenshot of a mobile web app screen. Look specifically for ' +
  'VISUAL BUGS: text or buttons overlapping each other, content cut off by ' +
  'the screen edge, elements that look squeezed/wrapped awkwardly, or ' +
  'controls that look too small/close together to tap reliably. If you see ' +
  'any of these, describe exactly what and where in one sentence. If ' +
  'nothing looks broken, output exactly: looks fine';

async function askVision(pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: MODEL, prompt: PROMPT, images: [b64],
        think: false, stream: false,
        options: { num_ctx: 1024, temperature: 0, seed: 42 },
      }),
    });
    if (!res.ok) return { error: `Ollama returned ${res.status}` };
    const data = await res.json();
    return { text: (data.response || '').trim() };
  } catch (e) {
    return { error: `Ollama unavailable or too slow (${e.name}: ${e.message})` };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const shots = [];

  await page.goto(BASE_URL + '/index.html');
  await page.waitForTimeout(2000);
  shots.push(['recommend screen (default mobile view)', await page.screenshot()]);

  await page.locator('[data-screen="map"]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  shots.push(['map screen + hero-card', await page.screenshot()]);

  await page.locator('#open-stats').click().catch(() => {});
  await page.waitForTimeout(500);
  shots.push(['atlas stats modal', await page.screenshot()]);
  await page.locator('#stats-close').click().catch(() => {});

  await page.locator('#add-place').click().catch(() => {});
  await page.waitForTimeout(300);
  shots.push(['new-place modal', await page.screenshot()]);

  await browser.close();

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Saving ${shots.length} screenshots to ${OUT_DIR}/ — this is the part actually worth trusting; look at them yourself.\n`);

  for (const [label, buf] of shots) {
    const file = `${OUT_DIR}/${label.replace(/[^a-z0-9]+/gi, '-')}.png`;
    writeFileSync(file, buf);
    const { text, error } = await askVision(buf);
    if (error) {
      console.log(`${file} — AI check FAILED (${error}); look at the file directly.`);
      continue;
    }
    // Calibration failed 2/2 on this project's own known real bugs (see
    // this file's top comment / EXPERIMENT-LOG.md v12) — printed as a
    // labeled, skippable aside, never as a verdict to act on by itself.
    console.log(`${file}\n  [unverified AI aside, do not trust]: ${text}`);
  }
}

main();
