TASK
Write `tests/places-id.test.mjs`: unit tests for `ensurePlaceId()` from
`js/places.js`, using Node's built-in test runner (`node:test` +
`node:assert/strict`).

IMPORTANT — same real blocker as 03a, solved the same way
`js/places.js` itself does `const vocab = await fetch(VOCAB_URL)...` as a
top-level await, and throws in plain Node on the relative URL. Use the exact
same stub-then-dynamic-import pattern (see 03a-test-profile.md for the full
explanation of why a static import would crash):

```js
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const vocabData = JSON.parse(
  readFileSync(new URL('../data/vocab.json', import.meta.url))
);
globalThis.fetch = async () => ({ json: async () => vocabData });

const { ensurePlaceId } = await import('../js/places.js');
```

RELEVANT CODE — js/places.js:
```js
const usedIds = new Set();
export function ensurePlaceId(p){
  if(p.id){ usedIds.add(p.id); return p; }
  let candidate = Math.random().toString(36).slice(2, 10);
  while (usedIds.has(candidate)) {
    candidate = Math.random().toString(36).slice(2, 10);
  }
  usedIds.add(candidate);
  p.id = candidate;
  return p;
}
```
Note: `usedIds` is module-level state, shared across every call in the same
test run (there is no way to reset it from outside the module, and no export
exists for it — don't try to reach into it or mock `Math.random` to force a
collision; write black-box tests that only rely on the function's public
input/output behavior, described below).

TEST CASES — write these as separate `test(...)` blocks:

1. **Existing id is preserved unchanged**: call
   `ensurePlaceId({ id: 'existing123', name: 'Test' })`, assert the returned
   object's `.id === 'existing123'` (unchanged) and `.name === 'Test'`
   (untouched).

2. **Missing id gets a well-formed random one**: call
   `ensurePlaceId({ name: 'No Id Place' })`, assert the result has an `.id`
   property, it's a string, and it matches `/^[a-z0-9]{1,8}$/` (base36 of a
   random fraction can occasionally be shorter than 8 chars if it has
   trailing zeros stripped — don't assert exactly 8 chars, just 1-8
   lowercase-alphanumeric).

3. **Repeated calls without an id never collide**: call
   `ensurePlaceId({ name: `Place ${i}` })` in a loop 50 times (each call a
   fresh object, no `id` field), collect all resulting `.id` values into an
   array, and assert `new Set(ids).size === ids.length` (all unique).

CONSTRAINTS
- File: `tests/places-id.test.mjs` (create `tests/` if it doesn't already
  exist from 03a/03b — don't remove anything already there).
- Only `node:test`, `node:assert/strict`, `node:fs` — no other imports.
- Use the exact fetch-stub + dynamic-import pattern shown above.

VERIFICATION
I will save the file and run `node --test` myself, and check all 3
tests pass with 0 failures, and running it twice in a row still passes (the
50-call uniqueness test should never be flaky given the id space, but note
if you disagree in a comment rather than silently changing the approach).

DO NOT
- Don't modify js/places.js.
- Don't try to reset or access `usedIds` from the test — it's not exported.
- Don't mock `Math.random` to try to force a collision — write black-box
  tests only, as specified above.
- Don't add a package.json or any npm dependency.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
