/**
 * Refines a frame's static drive-time estimate (migrate.ts's parsed-or-
 * assumed-speed figure) with a real, road-network-aware lookup — issue
 * 146: "RISO1 only ever shows the static estimate from migrate.ts — no
 * live lookup, so a frame's drive time can be meaningfully off from the
 * real driving time." Ported from the live site's equivalent
 * (js/map.js's `loadDriveTime`), same provider and same fail-soft
 * contract: a 5s timeout, a network error, or a malformed response all
 * resolve to `undefined` — the caller keeps showing the static estimate
 * exactly as if this had never been tried, never a thrown error, never a
 * visible "route not found" state.
 *
 * Provider: OSRM's public demo router (router.project-osrm.org) — free,
 * no API key, the same one the live site uses. No SLA; this is a
 * best-effort refinement, not a dependency the product requires to work.
 *
 * Cached in memory per origin/destination pair for the life of the page.
 */
export interface LiveDriveTime {
  minutes: number;
  km: number;
}

const cache = new Map<string, Promise<LiveDriveTime | undefined>>();

export function fetchLiveDriveTime(origin: { lat: number; lon: number }, dest: { lat: number; lon: number }): Promise<LiveDriveTime | undefined> {
  const key = `${origin.lat},${origin.lon};${dest.lat},${dest.lon}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=false`;
      let res: Response;
      try {
        res = await fetch(url, { signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) return undefined;
      const data = await res.json();
      const route = data?.routes?.[0];
      if (!route || typeof route.duration !== "number" || typeof route.distance !== "number") return undefined;
      return { minutes: Math.round(route.duration / 60), km: Math.round(route.distance / 1000) };
    } catch {
      return undefined;
    }
  })();

  cache.set(key, promise);
  return promise;
}

/** Test-only: the module-level cache would otherwise leak resolved/pending promises across test cases. */
export function _resetLiveDriveTimeCacheForTests(): void {
  cache.clear();
}
