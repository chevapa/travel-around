import { describe, expect, it } from "vitest";
import type { Frame } from "./frame";
import { computeExplorationStats } from "./stats";

function frame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "id",
    name: "Test",
    state: "unprinted",
    lat: 0,
    lon: 0,
    driveMinutes: 10,
    distanceKm: 5,
    tags: [],
    ...overrides,
  };
}

describe("computeExplorationStats", () => {
  it("returns all zeros and 0% for an empty dataset, rather than dividing by zero", () => {
    const stats = computeExplorationStats([]);
    expect(stats).toEqual({ total: 0, explored: 0, loved: 0, fine: 0, unprinted: 0, wantReturn: 0, percent: 0, countryBreakdown: [] });
  });

  it("counts loved/fine/unprinted and treats loved+fine as explored", () => {
    const frames = [frame({ state: "loved" }), frame({ state: "fine" }), frame({ state: "unprinted" }), frame({ state: "unprinted" })];
    const stats = computeExplorationStats(frames);
    expect(stats.total).toBe(4);
    expect(stats.loved).toBe(1);
    expect(stats.fine).toBe(1);
    expect(stats.unprinted).toBe(2);
    expect(stats.explored).toBe(2);
    expect(stats.percent).toBe(50);
  });

  it("counts wantReturn", () => {
    const frames = [frame({ wantReturn: true }), frame({ wantReturn: true }), frame({ wantReturn: false }), frame({})];
    expect(computeExplorationStats(frames).wantReturn).toBe(2);
  });

  it("rounds the overall percent", () => {
    const frames = [frame({ state: "loved" }), frame({ state: "unprinted" }), frame({ state: "unprinted" })];
    expect(computeExplorationStats(frames).percent).toBe(33); // 1/3 rounds to 33
  });

  it("builds a country breakdown, sorted by percent descending, excluding countries with zero explored", () => {
    const frames = [
      frame({ country: "hr", state: "loved" }),
      frame({ country: "hr", state: "unprinted" }),
      frame({ country: "mk", state: "loved" }),
      frame({ country: "si", state: "unprinted" }), // 0% explored — excluded
    ];
    const stats = computeExplorationStats(frames);
    expect(stats.countryBreakdown).toEqual([
      { code: "mk", total: 1, explored: 1, percent: 100 },
      { code: "hr", total: 2, explored: 1, percent: 50 },
    ]);
  });

  it("groups frames with no country under '?' rather than dropping them", () => {
    const frames = [frame({ state: "loved" })]; // no country field
    const stats = computeExplorationStats(frames);
    expect(stats.countryBreakdown).toEqual([{ code: "?", total: 1, explored: 1, percent: 100 }]);
  });
});
