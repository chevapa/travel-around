import { describe, expect, it } from "vitest";
import { computeBounds, projectToPercent } from "./projection";

describe("computeBounds", () => {
  it("finds the min/max of a set of points", () => {
    expect(
      computeBounds([
        { lat: 45.8, lon: 15.9 },
        { lat: 42.0, lon: 21.4 },
        { lat: 46.0, lon: 14.5 },
      ]),
    ).toEqual({ minLat: 42.0, maxLat: 46.0, minLon: 14.5, maxLon: 21.4 });
  });

  it("degenerates to a zero-size box for a single point", () => {
    expect(computeBounds([{ lat: 45.8, lon: 15.9 }])).toEqual({ minLat: 45.8, maxLat: 45.8, minLon: 15.9, maxLon: 15.9 });
  });

  it("throws for an empty list rather than returning nonsense bounds", () => {
    expect(() => computeBounds([])).toThrow();
  });
});

describe("projectToPercent", () => {
  const bounds = { minLat: 42.0, maxLat: 46.0, minLon: 14.5, maxLon: 21.4 };

  it("places the northwest corner near the top-left, inside the margin", () => {
    const p = projectToPercent({ lat: 46.0, lon: 14.5 }, bounds, 8);
    expect(p.x).toBeCloseTo(8, 5);
    expect(p.y).toBeCloseTo(8, 5);
  });

  it("places the southeast corner near the bottom-right, inside the margin", () => {
    const p = projectToPercent({ lat: 42.0, lon: 21.4 }, bounds, 8);
    expect(p.x).toBeCloseTo(92, 5);
    expect(p.y).toBeCloseTo(92, 5);
  });

  it("places the midpoint at the centre", () => {
    const p = projectToPercent({ lat: 44.0, lon: 17.95 }, bounds, 8);
    expect(p.x).toBeCloseTo(50, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("higher latitude (further north) maps to a smaller y — screen-up, not screen-down", () => {
    const north = projectToPercent({ lat: 46.0, lon: 18 }, bounds, 8);
    const south = projectToPercent({ lat: 42.0, lon: 18 }, bounds, 8);
    expect(north.y).toBeLessThan(south.y);
  });

  it("never divides by zero for a degenerate (single-point) bounding box — centers instead", () => {
    const singlePointBounds = computeBounds([{ lat: 45.8, lon: 15.9 }]);
    const p = projectToPercent({ lat: 45.8, lon: 15.9 }, singlePointBounds);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.x).toBeCloseTo(50, 5);
    expect(p.y).toBeCloseTo(50, 5);
  });

  it("stays within [margin, 100-margin] for any point inside the bounds", () => {
    const p = projectToPercent({ lat: 44.5, lon: 18 }, bounds, 10);
    expect(p.x).toBeGreaterThanOrEqual(10);
    expect(p.x).toBeLessThanOrEqual(90);
    expect(p.y).toBeGreaterThanOrEqual(10);
    expect(p.y).toBeLessThanOrEqual(90);
  });
});
