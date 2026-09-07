/**
 * Resolves a place's real photo from Wikipedia at render time — issue 155:
 * "I saw... pictures that are publicly available on Wikipedia, which I
 * know on the example of a town that I show you on a screenshot. It has
 * [a] picture on the Wikipedia [but] for some reason it's not allowed at
 * all so I'm expecting you to fix that." Every frame in frames.json ships
 * with `photo: undefined` (see model/frame.ts's own comment on that field:
 * "resolved at render time, not at migration time") — this is that
 * resolution step, a plain fetch against Wikipedia's public REST API
 * rather than the live site's server-side equivalent (js/photos.js,
 * issue #35) or a baked-in dataset.
 *
 * Cached in memory per title for the life of the page — the same frame
 * opens many times in one session (map pin -> card -> close -> reopen)
 * and shouldn't refetch every time. Fails soft: a missing article, a
 * disambiguation page with no single representative photo, or a network
 * error all resolve to `undefined`, never a thrown error a caller has to
 * handle — callers fall back to whatever placeholder art they'd have
 * shown if no photo had ever been requested.
 */
const cache = new Map<string, Promise<string | undefined>>();

interface WikipediaSummary {
  type?: string;
  thumbnail?: { source?: string };
}

export function fetchWikipediaPhoto(title: string): Promise<string | undefined> {
  const key = title.trim();
  if (!key) return Promise.resolve(undefined);
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as WikipediaSummary;
      // A disambiguation page lists several unrelated articles with no
      // single representative photo — a wrong photo is worse than none.
      if (data.type === "disambiguation") return undefined;
      return data.thumbnail?.source;
    } catch {
      return undefined;
    }
  })();

  cache.set(key, promise);
  return promise;
}

/** Test-only: the module-level cache would otherwise leak resolved/pending promises across test cases. */
export function _resetWikipediaPhotoCacheForTests(): void {
  cache.clear();
}
