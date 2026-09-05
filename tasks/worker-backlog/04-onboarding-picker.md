TASK
Add a new pure function `pickOnboardingPlaces(places, n)` to `js/places.js`,
next to the existing `getVisiblePlaces` function.

GOAL
A function that picks `n` random, not-yet-visited places from a given array,
for the future new-user "get to know your preferences" swipe flow
(CLAUDE.md §8) — that flow itself is NOT part of this task, only this one
selection helper.

RELEVANT CODE — existing function to place this next to (js/places.js):
```js
export const PLACES = [];

// Возвращает подмножество PLACES, проходящее фильтр state. Чистая функция —
// не трогает DOM/карту, поэтому легко переиспользуется и из filters.js
// (для рендера списка/счётчиков), и потенциально откуда угодно ещё.
export function getVisiblePlaces(state){
  const q = state.query.trim().toLowerCase();
  return PLACES.filter(p=>{
    const text = [p.name,p.q,p.note,p.meta].filter(Boolean).join(" ").toLowerCase();
    return state.statuses.has(p.cat) &&
      state.countries.has(p.country) &&
      state.seasons.has(p.season) &&
      state.sources.has(sourceKey(p)) &&
      p.cats.some(c=>state.cats.has(c)) &&
      (!state.onlyReturn || p.wantReturn) &&
      (!q || text.includes(q));
  });
}
```

CONSTRAINTS
- Exact signature: `export function pickOnboardingPlaces(places, n = 6){ ... }`
  — takes an explicit `places` array parameter (do NOT read the global
  `PLACES` export directly; this must be a pure function of its argument,
  same style as `computeProfile(places)` in js/profile.js, for testability).
- Filter to only places with `cat === 'plan'` first (not-yet-visited — same
  meaning `cat === 'plan'` already has elsewhere in this codebase, e.g.
  recommend.js's candidate filter).
- From that filtered pool, return a RANDOM sample of up to `n` places, no
  duplicates, using a Fisher-Yates shuffle then `.slice(0, n)` — use exactly
  this algorithm, don't invent a different sampling method:
  ```js
  const shuffled = [...pool];
  for(let i = shuffled.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
  ```
- If the pool has fewer than `n` places, return all of them (don't pad,
  don't throw — `.slice(0, n)` on a shorter array already does the right
  thing on its own, no extra code needed for this case).
- Do not add any diversity-by-category weighting or other selection
  logic beyond plain random sampling — that's an intentional v2 idea, out of
  scope here.
- Add one short comment above the function (matching this file's comment
  style, e.g. the one above `getVisiblePlaces`) explaining it's for the
  future onboarding flow from CLAUDE.md §8.
- Do not touch `getVisiblePlaces`, `PLACES`, or anything else in the file.

VERIFICATION
I will apply this by hand and check:
- `pickOnboardingPlaces([{cat:'plan'},{cat:'plan'},{cat:'loved'}], 2)` returns
  an array of length 2, both entries have `cat === 'plan'`.
- `pickOnboardingPlaces([{cat:'plan'}], 6)` returns an array of length 1 (not
  padded, doesn't throw).
- `pickOnboardingPlaces([{cat:'loved'}], 6)` returns an empty array.
- Calling it twice on a pool of 10+ 'plan' places occasionally returns
  results in a different order (confirms it's actually randomized, not just
  `.slice(0, n)` on the original order).

DO NOT
- Don't touch any file other than js/places.js.
- Don't export or rely on any state outside the function's own parameters.
- Don't add npm dependencies.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
