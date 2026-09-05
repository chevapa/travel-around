# Place Content Model

> Resolves #4. This is the finalized contract for a `Place` object as stored
> in `places/*.json` — one stable, understandable shape to normalize the
> existing 116 places against (#6 and its subtasks #43/#44/#45/#46), and for
> anyone adding a new place by hand (see `places/README.md` for the
> practical how-to; this document is the "why does this field exist and
> what does it mean" reference behind it).

## Scope

This is the **common** Place contract — no category-specific fields yet
(that's deliberately out of scope; see `docs/editorial-guidelines.md`/#5 for
category guidance that lives entirely inside the existing free-text `note`
field instead). It also does not include anything about the user's
relationship to a place beyond the one existing boolean below — visit
history, ratings, likes/dislikes, and swipe feedback belong to a future
interaction/profile model (CLAUDE.md §1's "core loop"), not to the Place
object itself.

## Fields

### Identity
| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable unique identifier. Random, meaningless string (e.g. `b7nmno2d`) — auto-generated on load if omitted (see `ensurePlaceId()` in `js/places.js`). Interaction history keys off this, so once a place has real user data attached, its `id` should not change. |
| `name` | string | Display name, in Russian (the UI's one language — see #61). |
| `q` | string, optional | Name in the local language, used only to build a better Google search query (`js/map.js`'s `searchQ`). Falls back to `name` when absent. |

### Location
| Field | Type | Meaning |
|---|---|---|
| `lat`, `lng` | number | Decimal-degree coordinates. Required — everything downstream (map placement, Terra Incognita distance, drive-time, sorting) depends on these being real numbers. |
| `country` | string, optional | Country code — see `data/vocab.json`'s `countries` for the current enum. Unknown codes degrade gracefully (shown as-is, no flag) rather than breaking. |

### Classification
| Field | Type | Meaning |
|---|---|---|
| `cat` | string, optional | Visit **status** — `loved` / `ok` / `plan` (see `data/vocab.json`'s `statuses`). Despite the short name, this is status, not category — `cats` (plural) is category. Defaults to `plan` when absent. |
| `cats` | string[], optional | Place **type(s)** — the vocabulary in `data/vocab.json`'s `categories` (`castle`, `museum`, `nature`, …). A place can have more than one; the first three drive the popup's category badges. |

### Trip planning
| Field | Type | Meaning |
|---|---|---|
| `season` | string, optional | When the place is worth visiting — `all` / `warm` / `summer` / `stork` (see `data/vocab.json`'s `seasons` and `js/context.js`'s `SEASON_MONTH_RANGES`). Defaults to `all`. |
| `drive` | string, optional | Hand-authored travel time from Zagreb (e.g. `"1 ч 15 мин"`), shown in the popup and refined live by `loadDriveTime()`'s OSRM lookup. Free text, not a number — see #39's note on why sorting uses `haversineDistance()` on `lat`/`lng` instead of parsing this string. Missing on ~30% of research-sourced places (#48) — the UI must fall back gracefully, never interpolate `undefined`. |

### Editorial description
| Field | Type | Meaning |
|---|---|---|
| `note` | string | The actual editorial description — answers "why would I want to go here?" (see `docs/editorial-guidelines.md`/#5 for category-specific guidance on what to cover). This is the one field allowed to read as free prose; everything else on this page exists so `note` doesn't have to carry logistics, warnings, or source caveats too. |

### Practical constraints
| Field | Type | Meaning |
|---|---|---|
| `warn` | string, optional | A practical thing to check before going — opening hours, seasonal closures, safety notes (e.g. `"Купание в Купе — только летом"`). Rendered as its own flagged line in the popup, separate from `note`. #44 is the audit that moves warning-shaped text currently sitting in `note` into this field instead. |

### Source
| Field | Type | Meaning |
|---|---|---|
| `source` | string, optional | Where this place's information came from, when that provenance matters beyond the existing `src` visited/research flag below — e.g. `"Putni Kofer"` for the places imported from that outside collection. New field name, distinct from `src`, because they answer different questions ("who wrote this description" vs. "has the user actually been here") that were previously conflated (see **Resolving `meta`** below). |
| `src` | string, optional | `journal` (personal, already-visited experience) or `research` (AI/curated research pick, the default when absent) — drives the default "Источник" filter. Pre-existing field, unchanged by this document. |

### Existing return preference
| Field | Type | Meaning |
|---|---|---|
| `wantReturn` | boolean, optional | The one piece of "how the user feels about this place" that stays on the Place object rather than moving to a future profile model — it's really a property of the place-as-planned ("worth a repeat visit") rather than a rating/feedback event, and the whole swipe/like/rating history described in CLAUDE.md §5 doesn't exist yet for this app to move it into. Revisit this call once that history model actually ships. |

## Resolving `meta`

`meta` was flagged by #4 as an unjustified catch-all. A survey of all 93
places currently using it (`places/*.json`) found it means **three
different things depending on which file it's in**, never documented,
never validated:

1. **`base-visited-*.json`** — visit date + travel mode, e.g. `"30 авг ·
   авто"`. This is real information, but it's a record of *the user's own
   visit* — exactly the "user experience/visit" category this document is
   explicitly told not to fold into the Place object (see Scope above). It
   belongs in the future interaction/visit-log model, not here.
2. **`base-plans.json`** — a rough duplicate of `drive`, e.g. Озаль has
   both `"drive": "50 мин"` and `"meta": "~50 мин"`. Pure redundancy, an
   editing leftover from before `drive` was authored — safe to drop
   outright.
3. **`Putni-Kofer.json`** — source attribution, e.g. `"Источник: Putni
   Kofer. Статья о местах Северной Македонии."`. This is exactly the "source
   information, kept separate from the user-facing description" the
   original Place model already called for — it becomes the new `source`
   field above, not `meta`.

**Decision: drop `meta` from the Place contract entirely.** None of its
three real uses turned out to actually be a Place-level field once
untangled — one is user-visit data that belongs elsewhere, one was pure
duplication, and one already has a proper home in `source`. #43 (blocked on
this document) carries out the actual per-place migration: file 1's
date+mode text is preserved as source material for whenever the visit-log
model exists (not thrown away, just not written into `places/*.json`
anymore), file 2's `meta` is deleted, file 3's `meta` is renamed to
`source`.

## Non-goals (unchanged from #4)

- No category-specific fields on the common contract (see #5's guidance
  living inside `note` instead).
- No user experience/rating/visit-history fields beyond the one
  `wantReturn` exception above.
- No new fields beyond what's justified by an actual repeated need already
  observed in the real data (this document introduces exactly one: `source`,
  because real data already needed it under the wrong name).
