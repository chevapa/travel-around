TASK
Add a pure `haversineDistance` function to `js/context.js`, and export the
existing private `getPosition` function under the new name `getUserPosition`
(rename only — same body, same behavior).

GOAL
Two changes to `js/context.js`:
1. A new exported pure function that computes great-circle distance in km
   between two lat/lng points.
2. `getPosition` renamed to `getUserPosition` and exported (it's currently
   private, used only inside this file by `getWeather()`).

RELEVANT CODE — current relevant slice of js/context.js:

```js
function getPosition(){
  return new Promise(resolve => {
    if(!navigator.geolocation){ resolve(FALLBACK_COORDS); return; }
    const timer = setTimeout(() => resolve(FALLBACK_COORDS), 4000);
    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(FALLBACK_COORDS); },
      { maximumAge: 15 * 60 * 1000, timeout: 4000 }
    );
  });
}
```

It's called once later in the same file, inside `getWeather()`:
```js
const { lat, lng } = await getPosition();
```

EXISTING PATTERNS
This file already exports several pure functions the same way (see
`isSeasonSuitable`, `currentContext`) — plain `export function name(...){...}`,
no classes, no default export.

CONSTRAINTS
- New function signature: `export function haversineDistance(lat1, lng1, lat2, lng2)`
  returning the distance in kilometers as a number, using the standard
  haversine formula (Earth radius = 6371 km).
- Rename `getPosition` to `getUserPosition` in its declaration AND add
  `export` before `function`. Update the one call site inside `getWeather()`
  in this same file from `getPosition()` to `getUserPosition()`.
- Do not change `getUserPosition`'s internal logic, its `FALLBACK_COORDS`
  fallback, its timeout, or its return shape (`{lat, lng}`) — only its name
  and export status.
- Do not touch `getWeather`, `currentContext`, `isSeasonSuitable`,
  `classifyWeatherCode`, or anything else in the file.
- Place `haversineDistance` near the top of the file, close to the other
  small pure helpers, not inside `getWeather` or any other function.

VERIFICATION
I will apply this by hand and check:
- `grep -n "getPosition"` in `js/context.js` returns nothing (fully renamed).
- `grep -n "getUserPosition"` shows the export and the one call site inside
  `getWeather()`, both updated.
- `haversineDistance(45.8150, 15.9819, 45.8150, 15.9819)` (same point) returns
  0 (or effectively 0, allowing for floating point).
- `haversineDistance(45.8150, 15.9819, 45.4408, 15.5000)` (~roughly Zagreb to
  Karlovac) returns approximately 56 km (allow 50-62 km for rounding/formula
  variation).

DO NOT
- Don't touch any file other than js/context.js.
- Don't add npm dependencies — plain Math.* only.
- Don't change FALLBACK_COORDS or the weather-fetch logic.

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
