import { describe, expect, it } from "vitest";
import { countsByState, formatDrive, formatMeta, isPrinted, type Frame } from "./frame";

function makeFrame(overrides: Partial<Frame> = {}): Frame {
  return {
    id: "x",
    name: "Test place",
    state: "unprinted",
    lat: 0,
    lon: 0,
    driveMinutes: 30,
    distanceKm: 20,
    tags: [],
    ...overrides,
  };
}

describe("isPrinted", () => {
  it("is true for loved and fine", () => {
    expect(isPrinted(makeFrame({ state: "loved" }))).toBe(true);
    expect(isPrinted(makeFrame({ state: "fine" }))).toBe(true);
  });

  it("is false for unprinted", () => {
    expect(isPrinted(makeFrame({ state: "unprinted" }))).toBe(false);
  });
});

describe("formatDrive", () => {
  it("formats under an hour as 'N min'", () => {
    expect(formatDrive(52)).toBe("52 min");
    expect(formatDrive(5)).toBe("5 min");
  });

  it("formats an hour or more as 'H h MM'", () => {
    expect(formatDrive(64)).toBe("1 h 04");
    expect(formatDrive(120)).toBe("2 h 00");
    expect(formatDrive(125)).toBe("2 h 05");
  });

  it("rounds fractional minutes", () => {
    expect(formatDrive(59.6)).toBe("1 h 00");
  });

  it("rejects negative or non-finite input", () => {
    expect(() => formatDrive(-1)).toThrow();
    expect(() => formatDrive(NaN)).toThrow();
  });
});

describe("countsByState", () => {
  it("tallies every state, including zero counts", () => {
    const frames = [
      makeFrame({ state: "loved" }),
      makeFrame({ state: "loved" }),
      makeFrame({ state: "fine" }),
    ];
    expect(countsByState(frames)).toEqual({ loved: 2, fine: 1, unprinted: 0 });
  });

  it("returns all zeros for an empty list", () => {
    expect(countsByState([])).toEqual({ loved: 0, fine: 0, unprinted: 0 });
  });
});

describe("formatMeta", () => {
  it("labels every number — issue 127's plainer wording ('visited', not 'printed')", () => {
    expect(formatMeta("Zagreb", { loved: 31, fine: 11, unprinted: 74 })).toBe(
      "Zagreb · 42 visited / 74 not",
    );
  });

  it("never emits a bare number even at zero", () => {
    expect(formatMeta("Zagreb", { loved: 0, fine: 0, unprinted: 0 })).toBe(
      "Zagreb · 0 visited / 0 not",
    );
  });
});
