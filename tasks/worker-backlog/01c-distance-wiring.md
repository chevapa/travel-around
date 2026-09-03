TASK
Wire the user's position into `js/recommend.js`, mirroring exactly how
`weather` already works there: fetched once per session, stored in a module
variable, passed into `rankPlaces()`, and re-fetching triggers a re-rank when
it resolves.

RELEVANT CODE — the existing weather pattern in js/recommend.js (three spots):

Top-of-file import (line 11):
```js
import { currentContext, getWeather } from './context.js';
```

Module-level state (line 14-22):
```js
let queue = [];               // элементы {place, score, reasons} — см. buildQueue()
let stackEl, sheetBack, sheetBody;
// Погода — один запрос на сессию (см. context.js), приходит асинхронно
// уже после первого рендера; когда придёт, просто пересчитываем очередь.
let weather = null;
// "Показано" в эту сессию — только чтобы не заспамить журнал повторным
// логированием 'viewed' при каждом ре-рендере одной и той же верхней
// карточки (renderStack дергается чаще, чем реально меняется top of stack).
const viewedThisSession = new Set();
```

`buildQueue()` (line 29-40):
```js
function buildQueue(){
  const candidates = PLACES.filter(p =>
    p.cat === 'plan' && !hasInteraction(p.id, 'not_interested') && !hasInteraction(p.id, 'liked'));
  const profile = computeProfile(PLACES);
  const ctx = currentContext();
  const ranked = rankPlaces(candidates, profile, ctx, weather);
  // "На потом" не выкидываем — просто откладываем в конец очереди,
  // чтобы карточка попалась снова, но не мешала более уместным вариантам.
  const primary  = ranked.filter(r => !hasInteraction(r.place.id, 'saved_for_later'));
  const deferred = ranked.filter(r => hasInteraction(r.place.id, 'saved_for_later'));
  queue = [...primary, ...deferred];
}
```

End of `initRecommend()` (last lines of the file):
```js
  renderStack();

  // Погода приходит позже первого рендера (сетевой запрос + геолокация) —
  // когда придёт, просто пересчитываем очередь с уже известной погодой.
  // Не блокируем открытие экрана ради этого.
  getWeather().then(w => { weather = w; refreshRecommend(); });
}
```

GOAL
Position behaves exactly like weather: `userPos` starts `null`, gets fetched
once in `initRecommend()`, and `buildQueue()` forwards it into `rankPlaces()`
as the 5th argument (see `01b-distance-scoring.md` — `rankPlaces` now accepts
an optional `userPos` 5th param).

CONSTRAINTS
- Add `getUserPosition` to the existing import from `./context.js`:
  `import { currentContext, getWeather, getUserPosition } from './context.js';`
- Add one new module-level variable next to `let weather = null;`:
  `let userPos = null;` with a one-line comment above it matching the style of
  the weather comment (same idea: fetched once per session, updates trigger a
  re-rank).
- In `buildQueue()`, change the `rankPlaces(...)` call to pass `userPos` as
  the 5th argument: `rankPlaces(candidates, profile, ctx, weather, userPos)`.
  Nothing else in `buildQueue()` changes.
- At the end of `initRecommend()`, add a second fetch-once-and-rerank line
  right next to the existing weather one, same pattern:
  `getUserPosition().then(p => { userPos = p; refreshRecommend(); });`
  Keep both calls (weather's and this new one) as separate, independent
  `.then()` chains — do not combine them into one `Promise.all` or nest one
  inside the other.
- Do not change `buildQueue()`'s candidate filter, the primary/deferred
  split, `renderStack()`, `refreshRecommend()`, or anything else in the file.

VERIFICATION
I will apply this by hand and check:
- The app still loads and renders the recommend screen with no console errors
  (position fetch failing/denied must fall back silently, same as weather —
  this is already guaranteed by `getUserPosition`'s existing fallback logic
  from 01a, not something this task needs to add).
- `buildQueue()` passes 5 arguments to `rankPlaces` after the change.
- Both the weather and position fetches fire once per session, independently.

DO NOT
- Don't touch js/context.js or js/recommendationEngine.js in this task —
  those are 01a and 01b.
- Don't change the weather-fetching line or logic at all, only add the
  position one alongside it.
- Don't add a loading spinner, error UI, or any other new UI - this is
  wiring only, no visual changes.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
