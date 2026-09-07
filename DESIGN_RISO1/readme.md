# RISO1

A risograph-print design system for **personal travel atlases** — one person's map of places
they have and haven't been. It was extracted from a design review of
[chevapa.github.io/travel-around](https://chevapa.github.io/travel-around/), a personal
day-trip map for Zagreb, and from the direction that came out of that review.

The central idea, and the thing that makes RISO1 unlike a generic "riso aesthetic" kit: **riso
is not a palette here, it is a material.** Old paper, family snapshots with white borders,
tape, rubber stamps, handwriting. That material carries the product's core semantic:

> A place you've been is a **print**. A place you haven't is a **frame** still on the roll.

## Sources

| Source | What was taken |
|---|---|
| `https://chevapa.github.io/travel-around/` | Live product: structure, features, filter model, drive-time radius. Reviewed from user screenshots — **no codebase or Figma file was available**, so components here are authored from the review, not ported from source. |
| `Design Analysis.dc.html` (this project) | The critique the system answers: contrast failures, inverted marker hierarchy, competing basemap, buried card headline. |
| `Riso Atlas - Bold Direction.dc.html` (this project) | The direction itself — every component here appears in it. |
| `assets/ref-riso-map.webp`, `assets/collage*.*` | User-supplied references: hand-drawn riso geography, torn-paper photo collage. |
| `assets/photo-stack.jpeg`, `assets/photo-beach.jpeg` | User-supplied family snapshots — the literal source of the "print" metaphor. |

## The lexicon

Terminology is part of the system. Use these words in UI copy, code and conversation:

| Term | Means |
|---|---|
| **Printed** | You've been there. Sub-states: *loved* (colour print) and *fine* (black & white print). |
| **Not printed** | You haven't been. Renders as an empty, hatched frame. |
| **Frame** | One place, in any state. The unit of the product. |
| **To Print** | Both the wishlist verb and the "pick somewhere for today" action. |
| **New Frame** | Add a place. |
| **Same roll** | What's nearby. |
| **The Atlas** | The map view. |
| **The Index** | The filter panel (a physical card index). |
| **The Contact Sheet** | The album view of every frame. |

Rejected alternatives, for the record: *Latent* / *Unexposed* for unvisited (accurate, too
slow to read), *Print* as the noun for a place (breaks — an unvisited place has no print),
*Develop* for the action (implies the trip happens in-app).

---

## CONTENT FUNDAMENTALS

**Voice: a person's own notebook, not a product.** First person plural where it appears at all
("what have we actually done this year"). Never "users", never "discover amazing places".

- **Sentence case for prose, UPPERCASE for chrome.** Body copy is written normally; every
  button, tag, count and eyebrow is uppercase mono. That split is absolute.
- **Say the true thing, briefly.** "A restored manor house and a pleasant little town centre."
  One clause of what it is, one of whether it's worth it. Enthusiasm is allowed only when
  earned: "Busy, still worth it — take the long walk round the water."
- **Faint praise is content.** "It was fine" is a valid, shippable caption; the black-and-white
  print says the rest. The system has an opinion slot for mediocrity and uses it.
- **Every number is labelled.** "42 printed / 74 not", "105 frames match", "31 of 116 in
  frame" — never a bare "31". (The reviewed product showed three different unlabelled 31s
  meaning three different things; this rule exists because of that.)
- **Time, not distance.** Day trips are chosen by drive time. "52 min · 49 km", in that order.
- **Handwriting is for captions only** — a place name and a year, four words maximum.
- **No emoji, ever.** The reviewed product used category emoji in its chips; RISO1 replaces
  them with mono text tags. Unicode glyphs (⌕ ✕ ★ ↗ →) are chrome, not decoration.
- **Copy examples:** `To Print →` · `New Frame` · `Same roll →` · `frame not printed yet` ·
  `Reading the page` · `105 frames match` · `By drive time` · `Plitvice '24`.

---

## VISUAL FOUNDATIONS

**Colour.** Warm cream paper in three weights (`--paper-1` page, `--paper-2` panels,
`--paper-3` recessed ground) plus print white. One dark ink, `#191510`, never pure black,
in four strengths. Three flat inks — pink `#FF2E86` (roads, primary marks, "loved"), blue
`#1F4FD8` (water, everything unprinted, handwriting), yellow `#FFD200` (the single primary
action, tape, stamps) — plus green `#8FBF4A` which is **landcover only and never UI**. Inks
are flat and unmixed: applied with `mix-blend-mode: multiply` at 30–50% for terrain, at full
strength for marks. **No gradients anywhere.**

**Type.** Bricolage Grotesque 800 for display — uppercase, `-.045em` tracking, `.86`
line-height, and it is *meant* to nearly collide. Bricolage regular for prose (lede 21px,
body 16px). Space Mono 700 uppercase for **all** chrome: buttons, tags, counts, eyebrows,
distances. Caveat for print captions, never for UI. Filter labels and anything finger-sized
never go below 16px, and never below full ink.

**Spacing.** One content measure (1040px), a loose non-geometric ramp (5, 8, 11, 14, 16, 22,
26, 40, 64). Copy the value; do not snap to a 4/8 grid — the slight irregularity is the point.

**Backgrounds.** The Atlas ground is **torn photographs**: collage fragments clipped with
ragged `clip-path` polygons, then sunk under flat riso ink washes so they read as terrain
rather than pictures. Never a stock map tile, never a flat colour panel pretending to be a
map. Elsewhere, backgrounds are plain paper — the interest comes from borders and shadows.

**Grain.** One halftone dot screen (`radial-gradient`, 4px, multiply, .5) over the entire
composition, mounted as the last child of the outermost container. **Never per element** —
stacked screens moiré and destroy text contrast.

**Borders and radii.** `border-radius: 0` everywhere. Ink borders at three weights: 1.5px
hairline (tags, swatches), 2px standard, 2.5px heavy (panels, primary buttons). Unprinted
things get a 2px **dashed blue** border — dashes mean "not yet" throughout the system.
Dashed `--hairline` rules separate rows inside panels.

**Shadows.** Hard offset shadows only: `3px 3px 0`, `4px 4px 0`, `7px 7px 0`,
`12px 12px 0`, all opaque ink, **never blurred**. Prints are the one exception, casting a
translucent `rgba(25,21,16,.4)` — a photo lying on paper, not a card floating above it.
There are no inner shadows and no protection gradients: text never sits on a photo, so
nothing needs protecting. Contrast is achieved by putting type on solid paper, on the white
print border, or on an ink chip.

**Transparency and blur.** No blur, no frosted glass, ever. Transparency appears in exactly
three places: ink washes on terrain, the tape strip (`rgba(255,210,0,.72)`), and print
shadows. Panels are fully opaque.

**Tilt.** ±4° maximum, on **prints and tape only**. Text blocks, panels, the top bar and the
legend never rotate. Scrappy edges, straight reading.

**Imagery.** Warm, faded, grainy — sepia 20–35%, slight saturation lift, occasionally
partly desaturated. Printed-and-loved is full colour; printed-and-fine is
`grayscale(1) contrast(1.15)`. That greyscale is a *state*, not a style choice.

**Cards.** Paper fill, 2.5px ink border, hard offset shadow, square corners, optional tape
strip over the top edge. Cards never float over the map: they dock into a single right-hand
panel slot, and The Index and a FrameCard never appear at once.

**Motion.** Mechanical and short. Press: the button slides 2px into its own shadow, 90ms
linear. Panels: 160ms slide, no easing theatrics. No bounces, no fades on load, no parallax.
Hover leaves colour alone — the cursor and the press state do the work.

**Layout rules.** The top bar is the only fixed chrome. The legend is pinned bottom-left and
always visible. Panels cap at the viewport height with internal scroll and a pinned footer,
so a footer count is never cut off. Prints shrink below 28px to a plain colour/mono/dashed
square, but their tap target stays 44px.

---

## ICONOGRAPHY

**There is no icon set, and that is deliberate.** RISO1 uses single Unicode characters set in
Space Mono: `⌕` search, `✕` close and the stamped checkbox, `★` favourite, `↗` route,
`→` forward, `?` an unprinted frame, `⌂` back to the home map area (issue 157). Those cover
the product.

- **No icon font, no SVG icon library, no CDN icon set.** If a new action genuinely needs a
  mark, take another Unicode glyph before reaching for a library — and add it to the glyph
  card in `guidelines/brand-glyphs.html`.
- **No emoji.** The reviewed product used emoji in its category chips; the mono text tag
  replaced them.
- The only illustrative material is **photography** — the user's own snapshots, cropped and
  torn. Nothing in this system is hand-drawn as SVG.

**No logo.** The source product has no logo or wordmark file. The brand mark is therefore
*the word set in type*: the view's name in Bricolage Grotesque 800 uppercase, white on a pink
chip, rotated −1.5°. Nothing has been drawn or reconstructed. If a real mark exists, send it
and it replaces the type chip.

---

## Index

| Path | What's there |
|---|---|
| `styles.css` | The one entry point consumers link. Imports only. |
| `tokens/` | `fonts`, `colors`, `typography`, `spacing`, `effects` — all custom properties. |
| `components/core/` | `Paper` (+ `TapeStrip`), `Button`, `IconButton`, `Tag`, `StampCheck`, `GrainOverlay` |
| `components/atlas/` | `Print`, `FrameStack`, `RingLabel` (+ `RingSet`), `Legend`, `TornGround` |
| `components/shell/` | `TopBar`, `IndexPanel`, `FrameCard`, `ContactSheet` |
| `ui_kits/atlas/` | Click-through recreation of the product. Start here. |
| `guidelines/` | 18 specimen cards: colour, type, spacing, brand materials. |
| `assets/` | Photographs, collage references, and the reviewed product's screenshots. |
| `SKILL.md` | Agent-skill wrapper for use outside this tool. |

### Intentional additions

Nothing here was ported from a component library — no codebase or Figma file existed for the
source product. Every component maps 1:1 to an element in the reviewed product or in the
approved direction, with two exceptions, both infrastructure rather than UI:

- **`GrainOverlay`** — extracts the halftone screen so it can be mounted once and correctly.
- **`Paper` / `TapeStrip`** — the surface primitive every panel in the direction shares.
