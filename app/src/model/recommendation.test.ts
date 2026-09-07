import { describe, expect, it } from "vitest";
import type { Frame } from "./frame";
import { buildProfile, isSeasonSuitable, rankFrames, scoreFrame } from "./recommendation";

function frame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "id",
    name: "Test",
    state: "unprinted",
    lat: 0,
    lon: 0,
    driveMinutes: 30,
    distanceKm: 30,
    tags: [],
    ...overrides,
  };
}

describe("isSeasonSuitable", () => {
  it("is always suitable for 'all' or an unset season", () => {
    expect(isSeasonSuitable("all", 0)).toBe(true);
    expect(isSeasonSuitable(undefined, 0)).toBe(true);
  });

  it("checks the given month against the season's real range", () => {
    expect(isSeasonSuitable("summer", 6)).toBe(true); // July
    expect(isSeasonSuitable("summer", 0)).toBe(false); // January
    expect(isSeasonSuitable("warm", 3)).toBe(true); // April
    expect(isSeasonSuitable("warm", 11)).toBe(false); // December
  });

  it("never blocks a card for an unrecognized season value", () => {
    expect(isSeasonSuitable("solstice", 0)).toBe(true);
  });
});

describe("buildProfile", () => {
  it("derives tag affinity only from loved frames, not fine or unprinted", () => {
    const frames = [frame({ state: "loved", tags: ["castle"] }), frame({ state: "fine", tags: ["beach"] }), frame({ state: "unprinted", tags: ["view"] })];
    const profile = buildProfile(frames);
    expect(profile.tagAffinity).toEqual({ castle: 1 });
  });

  it("sums affinity across multiple loved frames sharing a tag", () => {
    const frames = [frame({ state: "loved", tags: ["castle"] }), frame({ state: "loved", tags: ["castle", "view"] })];
    expect(buildProfile(frames).tagAffinity).toEqual({ castle: 2, view: 1 });
  });

  it("carries the caller-supplied avoided tags through unchanged", () => {
    const avoided = new Set(["beach"]);
    expect(buildProfile([], avoided).avoidedTags).toBe(avoided);
  });
});

describe("scoreFrame", () => {
  const emptyProfile = { tagAffinity: {}, avoidedTags: new Set<string>() };

  it("scores a plain unprinted frame with only the novelty bonus", () => {
    const { score, reasons } = scoreFrame(frame({ state: "unprinted", distanceKm: 100 }), emptyProfile, 0);
    expect(score).toBe(1);
    expect(reasons).toEqual([{ title: "You haven't been here yet", sub: "a new place on the map", weight: 1 }]);
  });

  it("adds affinity bonus for tags matching loved places", () => {
    const profile = buildProfile([frame({ state: "loved", tags: ["castle"] })]);
    const { score, reasons } = scoreFrame(frame({ tags: ["castle"], distanceKm: 100 }), profile, 0);
    expect(score).toBe(2); // +1 novelty, +1 affinity
    expect(reasons.some((r) => r.title === "Similar to places you've loved")).toBe(true);
  });

  it("penalizes tags this session's skips avoided", () => {
    const profile = { tagAffinity: {}, avoidedTags: new Set(["beach"]) };
    const { score, reasons } = scoreFrame(frame({ tags: ["beach"], distanceKm: 100 }), profile, 0);
    expect(score).toBe(0); // +1 novelty, -1 avoided
    expect(reasons.some((r) => r.title === "Similar wasn't a hit earlier")).toBe(true);
  });

  it("gives a strong bonus for wantReturn", () => {
    const { score } = scoreFrame(frame({ wantReturn: true, distanceKm: 100 }), emptyProfile, 0);
    expect(score).toBe(4); // +1 novelty, +3 wantReturn
  });

  it("rewards a suitable season and penalizes an unsuitable one", () => {
    const inSeason = scoreFrame(frame({ season: "summer", distanceKm: 100 }), emptyProfile, 6); // July
    const offSeason = scoreFrame(frame({ season: "summer", distanceKm: 100 }), emptyProfile, 0); // January
    expect(inSeason.score).toBe(2); // +1 novelty, +1 season
    expect(offSeason.score).toBe(-1); // +1 novelty, -2 season
  });

  it("never scores a season penalty/bonus for 'all'", () => {
    const { reasons } = scoreFrame(frame({ season: "all", distanceKm: 100 }), emptyProfile, 0);
    expect(reasons.some((r) => r.title === "Right season" || r.title === "Off-season")).toBe(false);
  });

  it("rewards a nearby distance and penalizes a far one", () => {
    const near = scoreFrame(frame({ distanceKm: 20 }), emptyProfile, 0);
    const far = scoreFrame(frame({ distanceKm: 250 }), emptyProfile, 0);
    expect(near.score).toBe(2); // +1 novelty, +1 nearby
    expect(far.score).toBe(0); // +1 novelty, -1 far
  });

  it("includes a warn reason with zero weight — informational, not scored", () => {
    const { reasons } = scoreFrame(frame({ warn: "Closed Mondays", distanceKm: 100 }), emptyProfile, 0);
    expect(reasons).toContainEqual({ title: "Check before you go", sub: "Closed Mondays", weight: 0 });
  });

  it("caps reasons at 4, keeping the largest-magnitude ones", () => {
    const profile = buildProfile([frame({ state: "loved", tags: ["castle"] })]);
    const { reasons } = scoreFrame(
      frame({ tags: ["castle"], wantReturn: true, season: "summer", distanceKm: 20, warn: "Note" }),
      profile,
      6, // July — in season
    );
    expect(reasons).toHaveLength(4);
    // wantReturn (3) is the strongest signal and must survive the cap.
    expect(reasons[0].title).toBe("You marked this — want to return");
  });
});

describe("rankFrames", () => {
  it("sorts frames by score, highest first", () => {
    const frames = [frame({ id: "low", distanceKm: 250 }), frame({ id: "high", wantReturn: true, distanceKm: 20 }), frame({ id: "mid", distanceKm: 100 })];
    const ranked = rankFrames(frames, { tagAffinity: {}, avoidedTags: new Set() }, 0);
    expect(ranked.map((r) => r.frame.id)).toEqual(["high", "mid", "low"]);
  });
});
