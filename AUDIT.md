# AUDIT — RISO1 regression checklist

Source: `DESIGN_RISO1/Design Analysis.dc.html`, the design review RISO1 answers.
This is the Task 0 deliverable from `DESIGN_RISO1/IMPLEMENTATION_PLAN.md` — the
acceptance checklist Task 12 (regression gate, GitHub issue #97) walks before RISO1
can be considered done. Each row must be provably fixed, not just addressed.

| # | Issue | Fixed by | Never regress |
|---|---|---|---|
| CRIT 01 | Header collage overflows its container on three sides; wordmark half-buried behind the image; place count escapes its chip. | `TopBar` — no image, no collage. Wordmark is type on a pink chip only. | **Yes** |
| CRIT 02 | Filter labels ("Были, понравилось" / "Ещё не были" etc.) render at ~2.4:1 contrast — pale grey on cream — against a 4.5:1 requirement. Unselected state is shown by fading the label. | `IndexPanel` + `StampCheck` — every label full ink at ≥16px; unselected shown by the empty stamp only, never by fading text. | **Yes** |
| HIGH 03 | Stock basemap at full saturation (bright green forest, blue lakes, pink-hued motorways) competes with and sometimes beats the primary marker colour for attention. | `TornGround` — replaces the stock basemap entirely with cream/greige terrain; any real tile layer must be restyled (desaturated landcover, warm-grey roads, pale water, no POI icons), never shipped with a provider's default style. | **Yes** |
| HIGH 04 | Marker hierarchy is inverted — clusters are the biggest/loudest thing on screen despite carrying the least information — and there is no legend anywhere explaining what pin colour means. | `Print` (individual places get the colour/weight) + `FrameStack` (clusters muted, outlined, quiet) + `Legend` (permanent, bottom-left, doubles as a filter). | **Yes** |
| HIGH 05 | Four action buttons in four unrelated visual languages, no colour-to-importance relationship; the least-used control (search) is the widest element in the bar; toolbar floats detached from the header. | `TopBar` + `Button` — one bar, one hierarchy: icon → outline → ink → yellow (single primary). Search collapses to an icon that expands on click. | No (not one of the four critical fixes, but tracked here since it shares `TopBar`). |
| MED 06 | The place card's headline (the name) is buried below five metadata chips; card floats unanchored over the map with no pointer to its pin. | `FrameCard` — fixed order name → print → description → drive time → tags; anchored to the pin or docked, never floating free. | No |
| MED 07 | Opening filters while a card is showing stacks two overlapping sheets over the map; filter panel's footer count can be clipped; sections open collapsed with no indication of active state. | The panel slot (Task 7) — one positioned region, `null \| 'index' \| { frameId }` as a discriminated union; capped at viewport height with a pinned footer; collapsed sections show active values as removable chips. | No |
| MED 08 | Three different unlabelled "31"s on screen mean three different things; display face's `?` renders reversed and its Cyrillic caps are visibly weaker than its Latin caps. | `formatMeta` (Task 2, one helper, every number labelled) + the font swap in `tokens/fonts.css` (Task 1) — Bricolage/Space Mono/Caveat chosen partly to sidestep the Cyrillic weakness. Superseded in practice by the decision to ship the product in English (see epic #84), which removes the Cyrillic-rendering half of this issue outright. | No |

## The four that must never regress (per the plan's own ground rules)

CRIT 01, CRIT 02, HIGH 03, HIGH 04 — table above. Task 12 must re-prove each with an
automated check (contrast check, overflow assertion, screenshot-diff saturation
comparison, DOM assertion for the legend respectively), not eyeball them.

## Tracking

- Epic: [#84](https://github.com/chevapa/travel-around/issues/84)
- This task: [#85](https://github.com/chevapa/travel-around/issues/85)
- Regression gate that reads this file back: [#97](https://github.com/chevapa/travel-around/issues/97)
