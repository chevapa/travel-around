TASK
Add a distance-based scoring rule to `scorePlace()` in
`js/recommendationEngine.js`, following the exact style of the existing
weather rule (rule 6) right above where the new rule will go.

GOAL
`scorePlace` gains one more optional signal: how close the place is to the
user's current position. Close places get a small bonus with a 🚗 reason far
places get a small penalty with a 🚗 reason; anything in between adds no
reason (same "only the extremes get a reason" pattern the weather rule uses).

RELEVANT CODE — current end of scorePlace(), js/recommendationEngine.js:

```js
export function scorePlace(place, profile, ctx, weather){
  let score = 0;
  const reasons = [];

  // ... rules 1-5 unchanged, omitted here ...

  // 6) Погода — влияет только на места "на открытом воздухе".
  const isOutdoor = (place.cats || []).some(c => OUTDOOR_CATS.includes(c));
  if(weather && weather.key !== 'unknown' && isOutdoor){
    if(weather.key === 'good'){ score += 1.5; reasons.push({ icon: weather.icon, title:'Хорошая погода', sub:'отличный день для улицы', weight:1.5 }); }
    if(weather.key === 'bad'){ score -= 1.5; reasons.push({ icon: weather.icon, title:'Ожидаются осадки', sub:'может быть неудачный день для природы', weight:-1.5 }); }
  }

  // Важная информация, не влияющая на score.
  if(place.warn){
    reasons.push({ icon:'⚠️', title:'Проверить перед выездом', sub: place.warn, weight:0 });
  }

  reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { score, reasons: reasons.slice(0, 4) };
}

export function rankPlaces(places, profile, ctx, weather){
  return places
    .map(place => ({ place, ...scorePlace(place, profile, ctx, weather) }))
    .sort((a, b) => b.score - a.score);
}
```

Also the top-of-file import line:
```js
import { isSeasonSuitable } from './context.js';
```

CONSTRAINTS
- Add a 5th parameter `userPos` to BOTH `scorePlace(place, profile, ctx, weather, userPos)`
  and `rankPlaces(places, profile, ctx, weather, userPos)`, appended at the
  end. It must default to `null` (e.g. `userPos = null`) so existing callers
  that don't pass it yet still work unchanged.
- Update the import line to also bring in the new function:
  `import { isSeasonSuitable, haversineDistance } from './context.js';`
- Insert a new rule (call it rule 7) right after the existing weather rule
  (rule 6) and before the `place.warn` block, following this exact logic:
  ```js
  // 7) Расстояние — далеко ли ехать от текущего местоположения.
  if(userPos){
    const distanceKm = haversineDistance(userPos.lat, userPos.lng, place.lat, place.lng);
    if(distanceKm <= 50){ score += 1; reasons.push({ icon:'🚗', title:'Подходящее расстояние', sub:'рядом, можно съездить на день', weight:1 }); }
    if(distanceKm >= 200){ score -= 1; reasons.push({ icon:'🚗', title:'Далековато', sub:'потребует больше времени в пути', weight:-1 }); }
  }
  ```
- Do not change rules 1-6, the `place.warn` block, the sort, the slice, or
  anything else in the file.
- Inside `rankPlaces`, pass `userPos` through to `scorePlace` in the same
  position (5th argument).

VERIFICATION
I will apply this by hand and check:
- `scorePlace(place, profile, ctx, weather)` (no 5th arg) still works exactly
  as before — no crash, no distance reason added, same score as before this
  change, for the same 4 arguments.
- Calling with a 5th arg `{lat: 45.8150, lng: 15.9819}` and a place at the
  same coordinates adds the 🚗 "Подходящее расстояние" reason and +1 to score.
- Calling with a 5th arg where the place is >200km away adds the 🚗
  "Далековато" reason and -1 to score.
- `rankPlaces` still sorts correctly and forwards the 5th argument.

DO NOT
- Don't touch js/context.js or js/recommend.js in this task — those are
  separate dispatches (01a, 01c).
- Don't rename score, reasons, or any existing variable.
- Don't change the reasons.slice(0, 4) cap or the sort comparator.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
