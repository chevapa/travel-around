TASK
Write `tests/recommendationEngine.test.mjs`: unit tests for `scorePlace()`
from `js/recommendationEngine.js`, using Node's built-in test runner
(`node:test` + `node:assert/strict`). No dependencies, no config file.

No fetch/import blocker here — unlike profile.js, `js/recommendationEngine.js`
only imports `js/context.js`, which has no imports of its own, so a normal
static top-level import works fine:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scorePlace } from '../js/recommendationEngine.js';
```

RELEVANT CODE — signature and rule order (js/recommendationEngine.js):
`scorePlace(place, profile, ctx, weather)` returns `{ score, reasons }` where
`reasons` is an array of `{icon, title, sub, weight}`, sorted by
`Math.abs(weight)` descending, capped to the top 4.
`OUTDOOR_CATS = ['nature', 'beach', 'view', 'water', 'cave', 'bike']`.
`isSeasonSuitable(seasonKey, ctx)` (from context.js) checks `ctx.month`
against per-season ranges; season `'summer'` is suitable for months 5-7
(June-August, 0-indexed), unsuitable outside that range.

Write exactly these 5 test cases as separate `test(...)` blocks. Each fixture
below is already minimal and each expected value is exact — don't recompute
or "improve" them, just translate directly into assertions.

CASE A — liked characteristic bonus only
```js
scorePlace(
  { cats: ['museum'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 },
  { characteristicAffinity: { museum: 2 }, avoidedCharacteristics: [] },
  {}, null
)
```
Expect: `score === 2`, `reasons.length === 1`, `reasons[0].icon === '❤️'`, `reasons[0].weight === 2`.

CASE B — wantReturn bonus only
```js
scorePlace(
  { cats: [], cat: 'ok', season: 'all', warn: '', wantReturn: true, lat: 0, lng: 0 },
  { characteristicAffinity: {}, avoidedCharacteristics: [] },
  {}, null
)
```
Expect: `score === 3`, `reasons.length === 1`, `reasons[0].icon === '★'`, `reasons[0].weight === 3`.

CASE C — novelty bonus for cat 'plan'
```js
scorePlace(
  { cats: [], cat: 'plan', season: 'all', warn: '', lat: 0, lng: 0 },
  { characteristicAffinity: {}, avoidedCharacteristics: [] },
  {}, null
)
```
Expect: `score === 1`, `reasons.length === 1`, `reasons[0].icon === '📍'`, `reasons[0].weight === 1`.

CASE D — season mismatch penalty
```js
scorePlace(
  { cats: [], cat: 'ok', season: 'summer', warn: '', lat: 0, lng: 0 },
  { characteristicAffinity: {}, avoidedCharacteristics: [] },
  { month: 0 }, null
)
```
(month 0 = January, outside summer's [5,7] range)
Expect: `score === -2`, `reasons.length === 1`, `reasons[0].icon === '📅'`, `reasons[0].weight === -2`.

CASE E — weather bonus applies ONLY to outdoor-tagged places (two assertions
in one test, indoor vs outdoor, same weather)
```js
const weather = { key: 'good', icon: '☀️' };
const profileEmpty = { characteristicAffinity: {}, avoidedCharacteristics: [] };
const indoor = scorePlace({ cats: ['museum'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 }, profileEmpty, {}, weather);
const outdoor = scorePlace({ cats: ['nature'], cat: 'ok', season: 'all', warn: '', lat: 0, lng: 0 }, profileEmpty, {}, weather);
```
Expect: `indoor.score === 0`, `indoor.reasons.length === 0` (weather bonus
does NOT apply — museum isn't in OUTDOOR_CATS); `outdoor.score === 1.5`,
`outdoor.reasons.length === 1`, `outdoor.reasons[0].icon === '☀️'`,
`outdoor.reasons[0].weight === 1.5`.

CONSTRAINTS
- File: `tests/recommendationEngine.test.mjs` (create `tests/` if it doesn't
  exist yet — 03a may have already created it, that's fine, don't remove
  anything else already in that directory).
- Only `node:test`, `node:assert/strict`, and the one import from
  `../js/recommendationEngine.js` — no other imports.
- Use `assert.equal` for scalar checks, don't use `assert.deepEqual` on the
  whole `reasons` array (only check the specific fields listed above, so the
  tests don't break if unrelated reason fields like `sub`/`title` text
  changes later).

VERIFICATION
I will save the file and run `node --test` myself, and check all 5
tests pass with 0 failures.

DO NOT
- Don't modify js/recommendationEngine.js or js/context.js.
- Don't test `rankPlaces` — out of scope, this task is scorePlace only.
- Don't add a package.json or any npm dependency.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
