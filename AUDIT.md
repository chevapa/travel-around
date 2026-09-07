# AUDIT — RISO1 regression checklist

Source: `DESIGN_RISO1/Design Analysis.dc.html`, the design review RISO1 answers.
This is the Task 0 deliverable from `DESIGN_RISO1/IMPLEMENTATION_PLAN.md` — the
acceptance checklist Task 12 (regression gate, GitHub issue #97) walks before RISO1
can be considered done. Each row must be provably fixed, not just addressed.

| # | Issue | Fixed by | Never regress |
|---|---|---|---|
| CRIT 01 | Header collage overflows its container on three sides; wordmark half-buried behind the image; place count escapes its chip. | `TopBar` — no image, no collage. Wordmark is type on a pink chip only. | **Yes** |
| CRIT 02 | Filter labels ("Были, понравилось" / "Ещё не были" etc.) render at ~2.4:1 contrast — pale grey on cream — against a 4.5:1 requirement. Unselected state is shown by fading the label. | `IndexPanel` + `StampCheck` — every label full ink at ≥16px; unselected shown by the empty stamp only, never by fading text. | **Yes** |
| HIGH 03 | Stock basemap at full saturation (bright green forest, blue lakes, pink-hued motorways) competes with and sometimes beats the primary marker colour for attention. | **Reverted, issue 158 (2026-09-07):** the cream/greige restyle (`lib/mapStyle.ts`'s `restyleToRiso`) shipped and held for a while, but real-user feedback called the result "over-engineered... really hard to read" and asked for a standard-looking map (komoot cited as the target) instead. `MapBase` now renders the tile provider's own "liberty" style completely unmodified — `lib/mapStyle.ts` and its regression test (`src/lib/saturation.test.ts`) are deleted, not just unused. This finding is knowingly reopened, not accidentally regressed. | No (see note) |
| HIGH 04 | Marker hierarchy is inverted — clusters are the biggest/loudest thing on screen despite carrying the least information — and there is no legend anywhere explaining what pin colour means. | `Print` (individual places get the colour/weight) + `FrameStack` (clusters muted, outlined, quiet) + `Legend` (permanent, bottom-left, doubles as a filter). | **Yes** |
| HIGH 05 | Four action buttons in four unrelated visual languages, no colour-to-importance relationship; the least-used control (search) is the widest element in the bar; toolbar floats detached from the header. | `TopBar` + `Button` — one bar, one hierarchy: icon → outline → ink → yellow (single primary). Search collapses to an icon that expands on click. | No (not one of the four critical fixes, but tracked here since it shares `TopBar`). |
| MED 06 | The place card's headline (the name) is buried below five metadata chips; card floats unanchored over the map with no pointer to its pin. | `FrameCard` — fixed order name → print → description → drive time → tags; anchored to the pin or docked, never floating free. | No |
| MED 07 | Opening filters while a card is showing stacks two overlapping sheets over the map; filter panel's footer count can be clipped; sections open collapsed with no indication of active state. | The panel slot (Task 7) — one positioned region, `null \| 'index' \| { frameId }` as a discriminated union; capped at viewport height with a pinned footer; collapsed sections show active values as removable chips. | No |
| MED 08 | Three different unlabelled "31"s on screen mean three different things; display face's `?` renders reversed and its Cyrillic caps are visibly weaker than its Latin caps. | `formatMeta` (Task 2, one helper, every number labelled) + the font swap in `tokens/fonts.css` (Task 1) — Bricolage/Space Mono/Caveat chosen partly to sidestep the Cyrillic weakness. Superseded in practice by the decision to ship the product in English (see epic #84), which removes the Cyrillic-rendering half of this issue outright. | No |

## The four that must never regress (per the plan's own ground rules)

CRIT 01, CRIT 02, HIGH 03, HIGH 04 — table above. Task 12 must re-prove each with an
automated check (contrast check, overflow assertion, screenshot-diff saturation
comparison, DOM assertion for the legend respectively), not eyeball them.

**HIGH 03 update (issue 158):** deliberately reopened, not a regression slipping
through unnoticed — see the table row above. Only CRIT 01, CRIT 02, and HIGH 04
still hold as must-never-regress.

## Tracking

- Epic: [#84](https://github.com/chevapa/travel-around/issues/84)
- This task: [#85](https://github.com/chevapa/travel-around/issues/85)
- Regression gate that reads this file back: [#97](https://github.com/chevapa/travel-around/issues/97)

---

## Task 12 — Regression gate: evidence

Closing the loop this file opened. Each of the 8 issues below, closed with
proof — an automated test where the plan asks for one, a visual
verification note where jsdom's lack of a real browser makes that the
honest option (documented as such at the time, not asserted after the
fact).

| # | Fixed by | Evidence |
|---|---|---|
| CRIT 01 — header collage overflow | `TopBar.tsx` (Task 6) | `TopBar.test.tsx` › *"never renders an img — the wordmark is type on a chip, not a photo"* — an element that doesn't exist can't overflow. Also visually confirmed at 1440/1024/375px in Task 6's own verification pass (no overflow at any width). |
| CRIT 02 — filter-label contrast (~2.4:1) | `IndexPanel.tsx` + `StampCheck.tsx` (Task 7) | `src/lib/contrast.test.ts` › the real WCAG contrast-ratio formula run against the actual token hex values IndexPanel/Legend use for labels — all ≥ 4.5:1 (ink-on-paper-2: 15.95:1, ink-55-on-paper-2: 8.21:1). `IndexPanel.test.tsx` also asserts row labels carry no `opacity` styling regardless of checked state. |
| HIGH 03 — saturated basemap competes with pins | Reverted, issue 158 | No longer applies — see the table above. `lib/mapStyle.ts` and `src/lib/saturation.test.ts` (its regression check) were deleted along with the restyle they proved. |
| HIGH 04 — inverted marker hierarchy, no legend | `Print.tsx` + `FrameStack.tsx` + `Legend.tsx` (Tasks 4-5) | `FrameStack.test.tsx` › never fills with a saturated colour (paper + ink + handwritten numeral only). `AtlasScreen.test.tsx` › *"the Legend is always mounted"* — present on initial render, and confirmed still present with The Index open, a card open, and in the contact-sheet view. |
| HIGH 05 — four buttons, four visual languages | `TopBar.tsx` + `Button.tsx` (Task 6) | `TopBar.test.tsx` › action order (icon → secondary → invert → primary) and "exactly one primary (yellow) button" are both asserted directly. |
| MED 06 — card buries its headline | `FrameCard.tsx` (Task 7) | `FrameCard.test.tsx` › asserts document order name → description → drive time → tags, and that the name (`<h3>`) is the first child of the card body — a tag literally cannot render above it. |
| MED 07 — panels stack instead of coexisting | the panel slot (Task 7) | `panelSlotReducer.test.ts` › the slot is one discriminated union (`empty \| index \| card \| newFrame`), not independent booleans — opening any one of the four always *replaces* whatever was open, proven for every pairwise combination. `PanelSlot.test.tsx` covers the same at the rendered-component level. |
| MED 08 — unlabelled counts; display face fights Cyrillic | `src/model/frame.ts`'s `formatMeta` (Task 2) + the English-lexicon decision (epic #84) | `frame.test.ts` › `formatMeta` never emits a bare number, matches the plan's own example exactly ("Zagreb · 42 printed / 74 not"). The Cyrillic-rendering half of the original issue is moot once the product ships in English (decided on epic #84) — self-hosted Latin-subset fonts only (Task 1). |

**Copy check** (plan: "no bare numbers, no emoji, no faded labels, sentence
case in prose and uppercase in chrome, no synonym for any locked term"):

- No bare numbers: every count in chrome goes through `formatMeta`, a
  `{label} · {count}` pattern (Legend, ContactSheet header), or a labelled
  Tag (drive time, coordinates) — grepped by hand across every component,
  none found.
- No emoji: `npm run lint:emoji` (new this task, wired into CI) — passes.
  RISO1's seven approved chrome glyphs (⌕ ✕ ★ ↗ → ◠ and unprinted `?`) are
  explicitly excluded from the check, not the whole Unicode block.
- No faded labels: covered by CRIT 02 above — `IndexPanel` asserts no
  `opacity` on row labels.
- Sentence case / uppercase split: every `Button`, `Tag`, eyebrow, and
  count is `text-transform: uppercase` in mono; row/prose text (frame
  descriptions, filter row labels) is body-face, sentence case as
  authored — never forced uppercase.
- No synonym for a locked term: grepped for the readme's own explicitly
  *rejected* alternatives ("Latent", "Unexposed", "Develop(ed/ing)") across
  `src/` — none found.

**Done when** (plan's own bar): all 8 closed with evidence — table above —
and a grep for emoji across `src/` returns nothing — `npm run lint:emoji`,
now enforced in CI on every push touching `app/**`.
