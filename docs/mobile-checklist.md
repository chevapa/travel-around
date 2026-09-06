# Mobile pre-commit checklist

> Resolves #79: "Each time you forget about it" — three real bugs shipped
> to a mobile viewport this session (#75's clipped stats button, #17's
> toast/badge overlap, and the desktop-only smoke tests in #77 that never
> ran against a phone width at all) before anyone actually looked at a
> phone-sized screen. This is the checklist that should have caught them,
> plus a script (`scripts/mobile-visual-check.mjs`) that automates the one
> part that turned out to actually be automatable — see step 2 below for
> what didn't work.

## Before committing any change that touches HTML/CSS/JS rendering

1. **Run the e2e suite** — `npm run test:smoke` now runs every spec against
   both `Desktop Chrome` and `Mobile Chrome` (see `playwright.config.js`).
   A mobile-only failure here is exactly the class of bug this checklist
   exists for — don't skip this because "it passed on desktop."
2. **Run `npm run check:mobile`** — screenshots the real screens at a
   phone viewport into `test-results/mobile-visual-check/` and **look at
   them yourself**. It also asks the local vision model for an opinion,
   printed as a clearly-labeled "unverified AI aside" — **do not trust
   that part**: calibrated against this project's own real, already-fixed
   bugs (the #75 wrapped stats button, the #17 clipped badge) by feeding
   it the actual before-fix screenshots, and it said "looks fine" on both
   (see `EXPERIMENT-LOG.md`'s v12 entry). The screenshots themselves are
   the reliable part of this step, not the model's commentary on them.
3. Specific things that have actually broken on this project, so check
   for these by name:
   - **A new button/link crammed into an existing responsive component**
     (#75) — does it need its own per-breakpoint rule, or is it safer as a
     fixed-size element that can't be affected by the surrounding text
     reflowing?
   - **A fixed-position element (toast, badge, label) near the bottom or
     edge of the screen** (#17) — does it collide with controls that are
     also anchored to that edge (nav buttons, action bars)?
   - **Absolutely-positioned close/action buttons** (#17) — does normal
     content have reserved space so it doesn't render underneath them?
   - **Tap target size** — a text-only link with no padding is a common
     real miss on a touchscreen even when it "works" in an automated
     click. Prefer a button with real padding or a fixed minimum size.

## What this does NOT replace

A real device is still the ground truth — viewport emulation catches
layout math, not real touch/scroll physics, notch/safe-area quirks, or
actual finger-size tap accuracy. This checklist (and the script) exist to
catch the class of bug that's obvious once you look, so it stops shipping
silently — not to replace looking at a real phone before something matters.
