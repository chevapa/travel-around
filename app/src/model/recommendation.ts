import type { Frame } from "./frame";

/**
 * Issue 141: ported from the live site's `js/recommendationEngine.js`
 * ("proto AI level" — a transparent sum of understandable bonuses/
 * penalties, never a trained model, so every recommendation can be
 * explained: CLAUDE.md §9, "not just 'Žumberak' but 'Žumberak —
 * because…'"). `js/context.js`'s `isSeasonSuitable` is folded in here too
 * — small enough not to warrant its own module, and RISO1 has no
 * `context.js` equivalent yet.
 *
 * Two real differences from the live site, both because the data this
 * app actually has is different:
 *
 * 1. **No interaction log.** The live site's `profile.js` derives
 *    characteristic affinity from a persisted history of swipes/visits
 *    (`interactions.js`). RISO1 has no write API (same "session-only"
 *    scope note as `AtlasScreen`'s `saveNewFrame`/want-to-go star) — so
 *    `buildProfile` derives "liked" affinity directly from frames already
 *    marked `loved`, and "avoided" affinity only from this session's own
 *    skip swipes (passed in by the caller, reset on reload). A real
 *    persisted interaction log is real future work, not faked here.
 * 2. **No weather.** The live site's engine also scores outdoor places
 *    against current weather (`context.js`'s weather fetch). That needs a
 *    live weather API and a location-permission flow this app doesn't
 *    have yet — deliberately left out rather than half-built; distance
 *    and season already give solid, honest signal without it.
 */

const SEASON_MONTH_RANGES: Record<string, [number, number]> = {
  warm: [3, 9], // Apr–Oct
  summer: [5, 7], // Jun–Aug
  stork: [2, 7], // Mar–Aug
};

/** `month` is 0-indexed (JS Date convention) — defaults to the real current month. */
export function isSeasonSuitable(season: string | undefined, month: number = new Date().getMonth()): boolean {
  if (!season || season === "all") return true;
  const range = SEASON_MONTH_RANGES[season];
  if (!range) return true; // an unrecognised season value never blocks a card
  return month >= range[0] && month <= range[1];
}

export interface RecommendationProfile {
  /** tag -> affinity score. Positive = comes from frames already loved. */
  tagAffinity: Record<string, number>;
  /** Tags from this session's own "not interested" swipes — a penalty, not a permanent ban (the proto model isn't confident enough to blacklist forever). */
  avoidedTags: ReadonlySet<string>;
}

/**
 * Derives a profile straight from the current frame data — no interaction
 * log needed for the "liked" half. `avoidedTags` is caller-supplied,
 * session-only state (see this file's own docstring).
 */
export function buildProfile(frames: readonly Frame[], avoidedTags: ReadonlySet<string> = new Set()): RecommendationProfile {
  const tagAffinity: Record<string, number> = {};
  for (const f of frames) {
    if (f.state !== "loved") continue;
    for (const tag of f.tags) tagAffinity[tag] = (tagAffinity[tag] ?? 0) + 1;
  }
  return { tagAffinity, avoidedTags };
}

export interface RecommendationReason {
  title: string;
  sub: string;
  /** Signed contribution to the score — also used to rank which reasons are worth showing (largest |weight| first). */
  weight: number;
}

export interface Recommendation {
  frame: Frame;
  score: number;
  /** Capped at the 4 most significant reasons — a recommendation should be quickly scannable, not an itemised ledger. */
  reasons: RecommendationReason[];
}

const NEARBY_KM = 50;
const FAR_KM = 200;

export function scoreFrame(frame: Frame, profile: RecommendationProfile, month: number = new Date().getMonth()): Recommendation {
  let score = 0;
  const reasons: RecommendationReason[] = [];

  const liked = frame.tags.filter((t) => (profile.tagAffinity[t] ?? 0) > 0);
  if (liked.length > 0) {
    const bonus = liked.reduce((sum, t) => sum + profile.tagAffinity[t], 0);
    score += bonus;
    reasons.push({ title: "Similar to places you've loved", sub: liked.slice(0, 3).join(", "), weight: bonus });
  }

  const avoided = frame.tags.filter((t) => profile.avoidedTags.has(t));
  if (avoided.length > 0) {
    score -= avoided.length;
    reasons.push({ title: "Similar wasn't a hit earlier", sub: avoided.join(", "), weight: -avoided.length });
  }

  if (frame.wantReturn) {
    score += 3;
    reasons.push({ title: "You marked this — want to return", sub: "just a matter of going back", weight: 3 });
  }

  if (frame.state === "unprinted") {
    score += 1;
    reasons.push({ title: "You haven't been here yet", sub: "a new place on the map", weight: 1 });
  }

  if (frame.season && frame.season !== "all") {
    if (isSeasonSuitable(frame.season, month)) {
      score += 1;
      reasons.push({ title: "Right season", sub: "this is the right time of year", weight: 1 });
    } else {
      score -= 2;
      reasons.push({ title: "Off-season", sub: "usually visited at a different time of year", weight: -2 });
    }
  }

  if (frame.distanceKm <= NEARBY_KM) {
    score += 1;
    reasons.push({ title: "Suitable distance", sub: "close enough for a day trip", weight: 1 });
  } else if (frame.distanceKm >= FAR_KM) {
    score -= 1;
    reasons.push({ title: "A bit far", sub: "needs more travel time", weight: -1 });
  }

  // Important, but doesn't affect the score — same as the live site.
  if (frame.warn) {
    reasons.push({ title: "Check before you go", sub: frame.warn, weight: 0 });
  }

  reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  return { frame, score, reasons: reasons.slice(0, 4) };
}

export function rankFrames(frames: readonly Frame[], profile: RecommendationProfile, month: number = new Date().getMonth()): Recommendation[] {
  return frames.map((f) => scoreFrame(f, profile, month)).sort((a, b) => b.score - a.score);
}
