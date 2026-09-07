import type { Frame } from "./frame";

export interface CountryExploration {
  code: string;
  total: number;
  explored: number;
  percent: number;
}

export interface ExplorationStats {
  total: number;
  explored: number;
  loved: number;
  fine: number;
  unprinted: number;
  wantReturn: number;
  /** Percent of `total` that's `explored` — 0 when there are no frames at all. */
  percent: number;
  /** Countries with at least one explored frame, sorted by exploration percent, highest first. */
  countryBreakdown: CountryExploration[];
}

/**
 * Issue 142: ported from the live site's `js/statsEngine.js`
 * (`computeExplorationStats`) — same deliberate "pure function over the
 * frame array, no separate stored state" principle its own comment
 * states, so a stats screen can never drift out of sync with the actual
 * frame data (same reasoning as `countsByState` in `frame.ts`).
 *
 * The live site's `js/profile.js` half (characteristic/season affinity,
 * favourite places) needs a real interaction log — issue #141's
 * recommendation/swipe screen, not built yet in this app — so it isn't
 * ported here. This covers exactly what issue 142 asks for: visited/
 * discovered place counts and a country-by-country breakdown, not
 * affinity scoring.
 */
export function computeExplorationStats(frames: Frame[]): ExplorationStats {
  const total = frames.length;
  const isExplored = (f: Frame) => f.state !== "unprinted";
  const explored = frames.filter(isExplored).length;
  const loved = frames.filter((f) => f.state === "loved").length;
  const fine = frames.filter((f) => f.state === "fine").length;
  const unprinted = frames.filter((f) => f.state === "unprinted").length;
  const wantReturn = frames.filter((f) => f.wantReturn).length;
  const percent = total ? Math.round((explored / total) * 100) : 0;

  const byCountry = new Map<string, { total: number; explored: number }>();
  for (const f of frames) {
    const key = f.country ?? "?";
    const entry = byCountry.get(key) ?? { total: 0, explored: 0 };
    entry.total += 1;
    if (isExplored(f)) entry.explored += 1;
    byCountry.set(key, entry);
  }
  const countryBreakdown = Array.from(byCountry.entries())
    .filter(([, v]) => v.explored > 0)
    .map(([code, v]) => ({ code, total: v.total, explored: v.explored, percent: Math.round((v.explored / v.total) * 100) }))
    .sort((a, b) => b.percent - a.percent);

  return { total, explored, loved, fine, unprinted, wantReturn, percent, countryBreakdown };
}
