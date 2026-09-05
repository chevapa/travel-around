TASK
Write `tests/profile.test.mjs`: unit tests for `computeProfile()` from
`js/profile.js`, using Node's built-in test runner (`node:test` +
`node:assert/strict`). No dependencies, no config file.

IMPORTANT — a real blocker you must work around, already solved below
`js/profile.js` imports `js/interactions.js`, which imports `js/places.js`,
which does `const vocab = await fetch(VOCAB_URL).then(r => r.json());` as a
TOP-LEVEL AWAIT. Plain Node's `fetch` throws on the relative URL
`'data/vocab.json'` (confirmed: `Failed to parse URL from data/vocab.json`).
A normal `import { computeProfile } from '../js/profile.js';` at the top of
the test file WILL CRASH at import time. You must stub `globalThis.fetch`
BEFORE the import happens, which means using a dynamic `await import(...)`
inside the test file's top-level code — NOT a static import statement (those
are hoisted and run before any other code, so a static import would already
have crashed before you got a chance to stub fetch).

Use exactly this pattern at the top of the test file:

```js
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const vocabData = JSON.parse(
  readFileSync(new URL('../data/vocab.json', import.meta.url))
);
globalThis.fetch = async () => ({ json: async () => vocabData });

const { computeProfile } = await import('../js/profile.js');
```

RELEVANT CODE — computeProfile and its inputs (js/profile.js, already loaded
via getAllInteractions — for THIS test, that resolves to just
getSeedInteractions(places), since the real interaction log is only ever
populated via async browser storage which is never touched in this test):

```js
const WEIGHTS = {
  visited_loved: 2, wants_to_return: 1.5, liked: 1,
  visited_ok: 0.5, saved_for_later: 0.2, not_interested: -1,
};
// seed interactions, derived purely from place.cat / place.wantReturn:
// cat === 'loved' or 'ok'  -> a 'visited' interaction (rating: place.cat)
// cat === 'loved'          -> ALSO a 'liked' interaction
// wantReturn === true      -> a 'wants_to_return' interaction
// computeProfile(places) sums weight * 1 into characteristicAffinity per
// place.cats entry, and into seasonAffinity[place.season] (only if season
// is set and not 'all'), for every interaction with weight !== 0.
```

TEST CASE — use this exact fixture and these exact expected numbers:

```js
const places = [
  { id: 'a', cats: ['nature', 'view'], cat: 'loved', season: 'summer' },
  { id: 'b', cats: ['museum'], cat: 'ok', season: 'all' },
  { id: 'c', cats: ['nature'], cat: 'plan' },
];
const profile = computeProfile(places);
```

Expected `profile`:
- `profile.characteristicAffinity` deep-equals `{ nature: 3, view: 3, museum: 0.5 }`
- `profile.seasonAffinity` deep-equals `{ summer: 3 }` (place b's season is
  'all', which is explicitly excluded — not a bug, don't "fix" it)
- `profile.favoritePlaceIds` deep-equals `['a']`
- `profile.avoidedCharacteristics` deep-equals `[]`
- `profile.counts` deep-equals `{ visited: 2, liked: 1, notInterested: 0, savedForLater: 0, wantsToReturn: 0 }`

Write this as one `test('computeProfile derives affinity from seed interactions', () => { ... })`
block using `assert.deepEqual` for each of the 5 fields above.

CONSTRAINTS
- File: `tests/profile.test.mjs` (create the `tests/` directory).
- Only `node:test`, `node:assert/strict`, `node:fs` — no other imports.
- Use the exact fetch-stub pattern shown above, dynamic import, in that order.
- Don't try to test the real-time `logInteraction()` / browser-storage path —
  out of scope, it needs a browser environment this test doesn't have.

VERIFICATION
I will save the file and run `node --test` myself, and check it
passes with 1 test, 0 failures, and that running it twice in a row gives the
same result (no flakiness / hidden shared state).

DO NOT
- Don't modify js/profile.js, js/interactions.js, or js/places.js.
- Don't add a package.json, test config, or any npm dependency.
- Don't use a static top-level import of profile.js — it will crash, see
  above.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
