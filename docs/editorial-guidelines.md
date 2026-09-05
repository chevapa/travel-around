# Editorial Guidelines for `note`

> Resolves #5. These are lightweight, category-specific *guidelines* for
> writing the Place `note` field (see `docs/place-content-model.md`/#4) —
> not a schema, not mandatory, not something validated by any script. `note`
> stays one free-text field; this document just says what's normally worth
> covering per category so descriptions have consistent *information
> quality* without sounding template-generated.

## The one question `note` has to answer

**"Why would I want to go here?"**

Every other consideration below is in service of that question. A `note`
that lists facts but never answers this hasn't done its job; a `note` that
answers it in one honest sentence has, even if it skips every bullet below.

## How to use this document

For each category in `cats`, a short list of aspects that *usually* matter.
Not a checklist to complete — a places with only one `cats` entry, or an
unusual one, should still read naturally. See CLAUDE.md's existing
principle: *"achieve consistent information quality without making all
Places sound like they were generated from the same template."* If a place
has several `cats` values, cover what's actually distinctive, not every
list below at once.

Prefer specific, concrete detail over generic praise. "Замок на скале с
музейным интерьером" tells you something; "красивое интересное место" does
not. The 93-place survey behind `docs/place-content-model.md` found the
existing `note` corpus already leans this way — keep it that way, don't
regress toward generic phrasing when writing new ones.

### `town` — towns and cities
- character (what kind of town this actually is — market town, resort,
  industrial-turned-quiet, university town)
- the main reason to visit, if there is one specific thing
- realistic visit duration (an afternoon vs. a whole day)
- notable sights worth naming, if a handful stand out

### `castle` — castles and fortifications
- architecture / historical period
- interior vs. exterior — is there actually something to see inside, or is
  it a ruin best appreciated from outside
- views / surroundings
- history, when it's the actual draw (a battle, a notable owner) rather than
  boilerplate

### `church` — churches and sacral sites
- what makes this one specific (architecture, a relic, a view, a festival)
  rather than "old church, nice inside"
- historical or religious significance where it's genuinely the draw

### `cave` — caves
- what's interesting about it specifically (formations, size, a
  guided-tour narrative)
- visit format — guided only? self-guided? tour length?
- physical difficulty, when relevant (stairs, cold, tight passages) — this
  is practical-constraint-shaped and may belong in `warn` instead of `note`
  if it's a hard requirement rather than color (see #44)

### `water` — lakes, rivers
- type (lake, river, canyon, gorge) and what you'd actually do there
  (swim, walk, boat)
- atmosphere / surroundings
- main reason to visit

### `beach` — beaches
- type of beach (sand, pebble, rock)
- water and surroundings
- atmosphere — is this a quiet cove or a busy resort strip
- the main reason to visit *this* beach over another

### `nature` — natural areas, hiking
- the main natural feature (a valley, a peak, a forest, a plateau)
- walking/hiking requirements — distance, difficulty, whether it's a stroll
  or a real hike
- the strongest single reason to go

### `view` — viewpoints
- what's actually visible from there, and why it's worth the trip up
- how you get there (short walk vs. drive-up vs. real climb) if that's a
  meaningful part of the experience

### `museum` — museums and attractions
- what the collection/exhibit actually is, not just "museum of X"
- what makes it worth a stop (a specific exhibit, a building, a reputation)
- realistic visit duration

### `food` — restaurants and food places
- what kind of food/experience this is
- atmosphere
- the main reason to choose this place specifically

### `bike`, `spa`, `culture` — thin categories today
Not enough real examples in the current data to write specific guidance yet
per #5's own instruction not to force every category into a template
prematurely — use the closest matching guidance above (`nature` for `bike`,
`town`/`culture` overlap) until there's a real, repeated need to define
more.

## What doesn't belong in `note`

Per `docs/place-content-model.md`, these have their own fields — moving
them out of `note` is exactly what #44 (warnings) and #43 (source/meta)
carry out against the existing 116 places:

- **Practical warnings/constraints** ("closed Mondays", "swim only in
  summer") → `warn`, not `note`.
- **Travel time/logistics** → `drive`, not `note`.
- **Source attribution** ("Источник: Putni Kofer...") → `source`, not `note`.

## What "consistent quality" does *not* mean

- It does not mean identical structure or length across places — a one-line
  `note` for a minor viewpoint and a three-sentence `note` for a major
  castle are both fine if each answers "why go here" honestly for what the
  place actually is.
- It does not mean every category's list above must be fully covered.
- It does not mean inventing detail a place doesn't have. An ambiguous or
  thin place should be flagged for editorial clarification (see #6's bucket
  2), not padded out to look complete.
