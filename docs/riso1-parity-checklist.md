# RISO1 parity checklist

Issue 129: "analyze old website functionalities and write them into use
cases... create checklist that you must verify working upon a release of
RISO1." Extracted from the live static site (`index.html`, `js/*.js`,
`data/vocab.json`) by reading its source, not by guessing — each row names
the file the behaviour actually lives in, so a later re-check can go
straight to the code. Status reflects the RISO1 app (`app/src/`) as of this
checklist's date.

Automated coverage lives in `app/src/**/*.test.tsx` (component-level) and
`tests-e2e/smoke.spec.js` (old site only, so far — see the last section).
Anything marked "manual" has no automated test yet.

## 1. Map & filtering

| Behaviour | Old site (file) | RISO1 | Status |
|---|---|---|---|
| Real basemap (tiles, roads, place labels) | `js/map.js` (Leaflet + OSM tiles) | `MapBase.tsx` (MapLibre + OpenFreeMap) | ✅ done |
| Marker clustering near dense areas | `js/map.js` (`markerClusterGroup`) | `clustering.ts` (supercluster) | ✅ done |
| Drive-time rings around Zagreb (1h/2h/3h, directionally calibrated ovals) | `js/map.js` (`RING_DATA`, `ovalPoints`) | `isochrone.ts` (`ZAGREB_DRIVE_RINGS`, ported 1:1) | ✅ done (issue 126) |
| Default filter: Croatia only | `js/filters.js` (`DEFAULT_COUNTRIES = ['hr']`) | `AtlasScreen.tsx` (`HOME_COUNTRY` default) | ✅ done (issue 123) |
| Filter by country (all 9) | `js/filters.js` (country checkbox list) | Index panel's "Country" tab | ✅ done (issue 123) |
| Filter by status (visited/loved, visited/fine, not visited) | `js/filters.js` (status checkboxes) | Index panel's "State" tab | ✅ done |
| Filter by category tag, from a place card | `js/map.js` (`cat-tag-btn` badges) | `FrameCard`'s tags (`onTagClick`) | ✅ done (issue 128) |
| Filter by season | `js/filters.js` (season checkboxes) | Index panel's "Season" tab | ✅ done (issue 143) |
| Filter by source (journal vs. research) | `js/filters.js` (source checkboxes) | Index panel's "Source" tab | ✅ done (issue 143) |
| "Want to return" filter | `js/filters.js` (`count-return`) | `AtlasScreen`'s want-to-go marks are session-only, no filter row yet | ⚠️ partial |
| Free-text search by name | `js/filters.js` (`#place-search` input) | `TopBar`'s search field | ✅ done (issue 131) |
| Select-all / clear-all shortcut per filter group | `js/filters.js` ("Выбрать все"/"Снять все") | Reset-filters button (shown when 0 frames match) | ⚠️ partial — always-visible select-all not yet ported, but the empty-filter dead end is fixed (issue 124) |
| Reduced default map extent (nearby only) | `js/map.js` (fixed `setView([45.85,15.60], 8)`) | Bounds fit to the default (Croatia-only) frame set | ⚠️ partial — narrower than before, but Croatia's own extent is still wider than a literal 3-4h radius (issue 125) |
| "Terra incognita" fade/decoration beyond the outer ring | `js/map.js` (`TERRA_GRADIENT`, `.terra-incognita-label`) | — | ❌ not ported — issue 54 (large, separate spec) scopes this for the old site itself and hasn't started |

## 2. Place card (popup / FrameCard)

| Behaviour | Old site (file) | RISO1 | Status |
|---|---|---|---|
| Name, photo, description, drive time/distance | `js/map.js` (`buildMarker` popup HTML) | `FrameCard.tsx` | ✅ done |
| Category badges, clickable to filter | `js/map.js` (`cat-tag-btn`) | `FrameCard`'s tags | ✅ done (issue 128) |
| Country badge, clickable to filter | `js/map.js` (`countryBadge`) | `FrameCard`'s country badge (`onCountryClick`) | ✅ done (issue 145) |
| Season badge, clickable to filter | `js/map.js` (`seasonBadge`) | `FrameCard`'s season badge (`onSeasonClick`) | ✅ done (issue 145) |
| "check before you go" warning line | `js/map.js` (`place.warn`) | `FrameCard`'s warn block | ✅ done (issue 144) |
| Name links out to a Google search | `js/map.js` (`searchUrl`, title link) | `FrameCard`'s name link (`searchUrl` prop) | ✅ done (issue 109 checklist) |
| "Draw route" link to Google Maps | `js/map.js` (`routeUrl`) | `FrameCard`'s Route button | ✅ done (issue 109 checklist, issue 133) |
| Live drive-time lookup (real routing API) | `js/map.js` (`fetchDriveTime`, OSRM) | `lib/liveDriveTime.ts` (same OSRM provider) refines `FrameCard`'s drive-time chip once the card opens | ✅ done (issue 146) |
| "★ want to return" marker | `js/map.js` (`pin-badge`, `star-mark`) | `FrameCard`'s "★ Want to go" button, reflected as a star on the map pin | ✅ done, renamed for clarity (issue 133, issue 127) |
| Terra Incognita popup variant for far-away places | `js/map.js` (`isTerraIncognita`) | — | ❌ not ported |
| Explore nearby/similar places | (no direct equivalent) | `FrameCard`'s "Similar places" button (filters by shared tag) | ✅ new in RISO1 |

## 3. Recommendation / swipe screen

`RecommendScreen.tsx` + `model/recommendation.ts` — the app's default
landing screen now (`App.tsx`), per `CLAUDE.md`'s product brief ("Where
should I go?" → one recommendation → swipe). Explicit like/skip/save
buttons, real scoring ported from `js/recommendationEngine.js` (see that
module's own docstring for the two deliberate differences: no persisted
interaction log yet, no weather). Two pieces of the live site's version
are still open, not silently dropped:

- **Drag-to-commit.** The live site supports dragging a card in three
  directions as well as tapping the buttons; RISO1 only has the buttons
  so far — real gesture-physics work (velocity thresholds, rotation,
  multi-touch), scoped as its own follow-up rather than rushed in
  alongside the scoring engine.
- **First-time onboarding.** The live site shows an onboarding pass for a
  user with zero history. This app ships with one fixed, already-lived-in
  dataset (31 loved, 11 fine, 74 unprinted) — there's no "brand new user"
  state to trigger it against — and onboarding itself is issue #59's own
  open design question, not decided here.

| Behaviour | Old site (file) | RISO1 | Status |
|---|---|---|---|
| Swipeable recommendation card (like/skip/save, drag + buttons) | `js/recommend.js` | `RecommendScreen.tsx` — buttons only, no drag yet | ⚠️ partial (issue 141) |
| Recommendation scoring (context, history, preferences) | `js/recommendationEngine.js` | `model/recommendation.ts` — no persisted interaction log or weather yet, see its docstring | ✅ done (issue 141) |
| First-time onboarding (no history yet) | `js/recommend.js` (`onboarding cards`) | — | ❌ not started — issue #59 |

## 4. Person / profile page

| Behaviour | Old site (file) | RISO1 | Status |
|---|---|---|---|
| Visited/discovered place counts, stats | `js/stats.js`, `js/statsEngine.js`, `js/profile.js` | `ProfileScreen.tsx` + `model/stats.ts` (`computeExplorationStats`) — exploration percent, state counts, country breakdown | ✅ done (issue 142). `js/profile.js`'s characteristic/season affinity scoring isn't ported — needs a real interaction log (issue #141), not built here yet. |

## 5. Performance

| Behaviour | Old site | RISO1 | Status |
|---|---|---|---|
| Re-clustering/filtering doesn't rebuild from scratch on every pan/zoom tick | N/A (Leaflet's own marker-cluster plugin) | `AtlasScreen`'s cluster index is now memoized on the filtered frame set, not rebuilt every render (issue 130) | ✅ done |

## How to (re-)verify this on a release

Automated, per behaviour above marked ✅: `npm test` in `app/` (or the
specific `*.test.tsx` named in that row's component). Manual, for anything
marked ⚠️/❌, or for a final visual pass before shipping: open the app,
and for each row above, exercise the described action and compare against
the old site at the equivalent URL (`index.html` locally, or the deployed
`/` root) side by side.
