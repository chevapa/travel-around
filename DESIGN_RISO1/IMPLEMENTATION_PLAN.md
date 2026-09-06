# RISO1 — Implementation Plan

An agent-executable plan to rebuild `chevapa.github.io/travel-around` on RISO1.

**Read first:** `readme.md` (lexicon + visual foundations), `ui_kits/atlas/README.md`.
**Reference implementations:** `components/**/*.jsx`. Port them; do not reinvent them.

## Ground rules for every task

1. **Lexicon is non-negotiable.** Printed / Not printed / Frame / To Print / New Frame / Same roll / The Atlas / The Index / The Contact Sheet. No synonyms in code, copy, or identifiers.
2. **Tokens only.** Every colour, font, space, shadow comes from `tokens/*.css`. A raw hex in a component is a bug.
3. **Never regress the four critique fixes** (see Task 0): full-ink filter labels, clipped header, non-competing ground, permanent legend.
4. **Ship each task green.** Every task ends with its own acceptance check passing before the next starts.
5. **State is the semantic.** `'loved' | 'fine' | 'unprinted'` is one union type, defined once, used everywhere. Never a boolean pair.

---

## Task 0 — Baseline audit and regression list

**Depends on:** nothing. Do this before touching code.

Read `Design Analysis.dc.html`. Write `AUDIT.md` recording the eight numbered issues and, for each, the file/component that will fix it. This becomes the acceptance checklist for Task 12.

The four that must never regress:

| # | Issue | Fixed by |
|---|---|---|
| CRIT 02 | Filter labels ~2.4:1 contrast | `IndexPanel` + `StampCheck` |
| CRIT 01 | Header collage overflows on three sides | `TopBar` (no image; type chip only) |
| HIGH 03 | Saturated stock basemap competes with pins | `TornGround` |
| HIGH 04 | Inverted marker hierarchy, no legend | `Print` + `FrameStack` + `Legend` |

**Done when:** `AUDIT.md` exists with all 8 issues mapped to a target file.

---

## Task 1 — Project scaffold and token pipeline

**Depends on:** none.

Stand up the app shell. Vite + React is the assumed target; adapt if the repo says otherwise.

- Copy `tokens/` and `styles.css` in unchanged. Import `styles.css` once at the app entry.
- Copy `assets/photo-stack.jpeg`, `photo-beach.jpeg`, `collage.jpeg`, `collage2.webp`. **Do not** copy `map.png`, `card.png`, `filters.png`, `ref-riso-map.webp` — those are review references, not product assets.
- Self-host the three Google fonts (Bricolage Grotesque, Space Mono, Caveat) rather than shipping the CDN `@import` in `tokens/fonts.css`; rewrite that file's `@import` to local `@font-face` rules and keep the four `--font-*` variables identical.
- Add a lint rule or CI grep that fails on `#[0-9a-f]{3,6}` inside `src/components/**`.

**Done when:** a blank page renders on `--paper-1`, `getComputedStyle(document.body).getPropertyValue('--pink')` returns `#FF2E86`, and all three font families load with no network request to fonts.googleapis.com.

---

## Task 2 — Data model and the state union

**Depends on:** 1.

One module, `src/model/frame.ts`, owning the vocabulary in types.

```ts
export type FrameState = 'loved' | 'fine' | 'unprinted';

export interface Frame {
  id: string;
  name: string;
  state: FrameState;
  photo?: string;        // required when state !== 'unprinted'
  caption?: string;      // handwriting; ≤ 4 words
  lat: number; lon: number;
  driveMinutes: number;  // authoritative; format at render
  distanceKm: number;
  stayMinutes?: number;
  description?: string;  // one clause what, one clause worth-it
  tags: string[];        // no emoji, ever
  source?: string;
}
```

Plus pure helpers, all unit-tested: `isPrinted(f)`, `formatDrive(mins)` → `"52 min"` / `"1 h 04"`, `formatMeta(counts)` → `"Zagreb · 42 printed / 74 not"`, `countsByState(frames)`.

Migrate the existing dataset: `visited && liked → 'loved'`, `visited && !liked → 'fine'`, `!visited → 'unprinted'`. Write the migration as a script, not by hand, and log any record that doesn't map.

**Done when:** tests pass, every legacy record maps to exactly one state, and `formatMeta` never emits a bare number.

---

## Task 3 — Core primitives

**Depends on:** 1.

Port `components/core/`: `Paper` (+ `TapeStrip`), `Button`, `IconButton`, `Tag`, `StampCheck`, `GrainOverlay`. Read each `.prompt.md` and `.d.ts` first — they carry the rules the JSX only implies.

Watch for:

- `Button` — exactly one `variant="primary"` per screen is a design rule the component can't enforce; add a dev-mode warning if more than one mounts.
- `StampCheck` — must be keyboard-operable (space/enter) and expose `role="checkbox"` + `aria-checked`.
- `GrainOverlay` — add a dev-mode warning if a second instance mounts anywhere in the tree.

**Done when:** a Storybook (or equivalent) page renders every variant of all six, `StampCheck` is fully keyboard-driven, and axe reports no violations.

---

## Task 4 — `Print`, the signature component

**Depends on:** 2, 3. **This is the highest-risk task in the plan; do it alone.**

Port `components/atlas/Print.jsx`. It carries the entire product semantic, so it gets its own task and its own test file.

Requirements beyond the reference:

- Below `--print-min` (28px) collapse to a plain square — colour fill / grey fill / dashed outline — while the hit area stays ≥ `--tap-min` (44px). Verify with `getBoundingClientRect()` in a test, not by eye.
- `edge` and `tilt` must **vary between neighbours**. Derive them deterministically from `frame.id` (hash → index 0-2, angle in ±4°) so a print doesn't jitter on re-render but no two adjacent prints match.
- Captions render on the white border only. Add a test asserting the caption node is never a descendant of, or positioned over, the `<img>`.
- `state="unprinted"` must not request an image.

**Done when:** all three states render at 3 sizes (96px / 56px / 20px), the 20px case is a bare square with a 44px target, and re-rendering the same frame 50× produces an identical transform.

---

## Task 5 — Atlas furniture

**Depends on:** 4.

Port `FrameStack`, `RingLabel` + `RingSet`, `Legend`, `TornGround`.

- `FrameStack` must stay visually quieter than any single `Print` — that inversion was HIGH 04. Paper fill, ink outline, handwritten numeral. Do not colour it.
- `TornGround` replaces the stock basemap **entirely**. If the app uses a real tile layer, the tiles must be restyled to cream/greige — landcover desaturated to ~10%, roads warm grey, water a pale tint, POI icons off — and the ink washes composited over them. **No tile provider's default style ships.**
- `RingSet` percentages in the reference are a mock. Replace with real isochrones (or drive-time-radius circles) computed from `driveMinutes`; keep the dashed stroke and the yellow `RingLabel` pennants.
- `Legend` is always mounted and always visible. Clicking a row isolates that state.

**Done when:** the map renders with no third-party default styling visible, the legend isolates on click, and a screenshot diff shows prints as the most saturated elements on screen.

---

## Task 6 — `TopBar`

**Depends on:** 3.

Port `components/shell/TopBar.jsx`.

- The wordmark is **type on a pink chip**. No image, no collage — that was CRIT 01. Nothing overflows its container.
- Actions ascend left to right: `IconButton` → secondary → invert → primary. Search is an icon that expands on click, never a permanently wide field (HIGH 05).
- `meta` always labels its numbers (Task 2's `formatMeta`).
- The bar never rotates. Assert `transform: none` on the bar and its children in a test.

**Done when:** the bar holds at 1440px / 1024px / 375px with no overflow and no wrap that breaks the action order; exactly one yellow button is present.

---

## Task 7 — The single panel slot

**Depends on:** 3, 4.

Port `IndexPanel`, `FrameCard`, `ContactSheet` — then build the **slot** that owns them.

The slot is one positioned region (right rail on desktop, bottom sheet on mobile) holding at most one occupant: `null | 'index' | { frameId }`. Model it as a discriminated union in a single reducer. Opening The Index closes any open card and vice versa — MED 07 was two overlapping sheets over the map.

Per component:

- **`IndexPanel`** — every label full-ink at ≥16px; unchecked shown by the empty stamp only (CRIT 02). Caps at viewport height with internal scroll and a **pinned** footer, so the match count is never clipped. Collapsed sections show their active values as removable chips.
- **`FrameCard`** — order is fixed: name → print → description → drive time → tags. Tags last, always (MED 06). Anchor to the pin or dock; never float unanchored mid-map.
- **`ContactSheet`** — ink surface, unprinted frames remain as dashed blanks. Sortable by date and by drive time.

**Done when:** it is impossible to have the card and the index open simultaneously (assert in a test), the panel footer is visible at 600px viewport height, and every filter label measures ≥ 4.5:1 against its background in an automated contrast check.

---

## Task 8 — Compose The Atlas screen

**Depends on:** 5, 6, 7.

Port `ui_kits/atlas/AtlasScreen.jsx` into the real app, replacing its mock positions with projected coordinates from `lat`/`lon`.

Mount order matters: `TornGround` → `RingSet` → prints/stacks → `TopBar` → `Legend` → panel slot → `GrainOverlay` **last**.

Wire: click a print → card; The Index → filter panel; legend row → isolate; `To Print` → pick one random unprinted frame, highlight it with a yellow outline, open its card.

**Done when:** all four interactions work, one grain layer exists in the DOM, and the map is legible at 375px wide.

---

## Task 9 — Clustering and zoom behaviour

**Depends on:** 8.

Real clustering (supercluster or equivalent) rendering `FrameStack` for groups and `Print` for leaves. As zoom decreases and prints cross 28px they collapse per Task 4. Cluster colour never encodes state — a stack is state-agnostic and quiet by design.

**Done when:** 116 frames render at every zoom level at ≥ 50fps on a mid-range laptop, and no cluster is more saturated than a leaf.

---

## Task 10 — New Frame flow

**Depends on:** 7. **Ask the user before building.**

This flow was never observed in the source product and is not specified anywhere in RISO1 — the UI kit ships it as a deliberate stub. Do not invent it.

Ask: does adding a place start from a map long-press, a search result, a pasted link, or a text field? Which fields are required beyond name and location? Is a photo required at capture time, or attached later when the frame is "printed"?

Then build in the panel slot using existing primitives only.

**Done when:** the user has answered, and the built flow uses no component or pattern not already in the system.

---

## Task 11 — Motion, responsive, print

**Depends on:** 8, 9.

- Press: 2px into own shadow, 90ms linear. Panels: 160ms slide. No bounce, no load fade, no parallax. Honour `prefers-reduced-motion`.
- Mobile: panel slot becomes a bottom sheet; `TopBar` keeps the primary action and collapses the rest behind the search glyph; `Legend` moves above the sheet, stays visible.
- The Contact Sheet should print cleanly to PDF — one grain layer, no clipped rows.

**Done when:** verified at 1440 / 1024 / 768 / 375, reduced-motion disables all transitions, and the Contact Sheet PDF has no cut rows.

---

## Task 12 — Regression gate

**Depends on:** all.

Walk `AUDIT.md` from Task 0. For each of the 8 issues, state where it is now fixed and prove it — automated contrast check for CRIT 02, overflow assertions for CRIT 01, screenshot-diff saturation comparison for HIGH 03, DOM assertion for the legend in HIGH 04.

Then check the copy: no bare numbers, no emoji, no faded labels, sentence case in prose and uppercase in chrome, no synonym for any locked term.

**Done when:** all 8 are closed with evidence, and a grep for emoji across `src/` returns nothing.

---

## Dependency order

```
0 ─┐
1 ─┴─ 2 ─┬─ 4 ── 5 ─┐
   └─ 3 ─┼─ 6 ──────┼─ 8 ── 9 ─┬─ 11 ── 12
         └─ 7 ──────┘          │
                     10 (gated on user answer)
```

Parallel-safe: {2, 3} after 1; {5, 6, 7} after their own deps; 10 is independent once 7 lands.

---

## Open questions — resolve before Task 6 and Task 10

1. **Fonts.** Bricolage Grotesque / Space Mono / Caveat are chosen, not inherited. The live site's display face rendered a reversed Cyrillic `?` and had weak Cyrillic caps — the reason for the swap. If a licensed face with proper Cyrillic exists, change it in `tokens/fonts.css` **now**, before Task 3.
2. **Language.** The direction is written in English, the live product in Russian. If Russian ships, re-verify every display string: Bricolage's Cyrillic caps are wider, and `--display-tracking: -.045em` may need relaxing to `-.03em`.
3. **Logo.** None exists; the mark is type on a pink chip. A real mark changes `TopBar` and nothing else.
4. **New Frame.** Blocked on Task 10's questions.
5. **Tile provider.** If a real basemap is required for geographic accuracy, which provider — and does its licence permit the restyling Task 5 requires?
