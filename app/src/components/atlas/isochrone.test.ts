import { describe, expect, it } from "vitest";
import { averageSpeedKmh, computeIsochroneRings } from "./isochrone";

describe("averageSpeedKmh", () => {
  it("computes the average implied speed from distance/time pairs", () => {
    // 60km in 60min = 60km/h; 90km in 60min = 90km/h -> average 75
    const speed = averageSpeedKmh([
      { distanceKm: 60, driveMinutes: 60 },
      { distanceKm: 90, driveMinutes: 60 },
    ]);
    expect(speed).toBeCloseTo(75, 5);
  });

  it("ignores records with zero or missing distance/time", () => {
    const speed = averageSpeedKmh([
      { distanceKm: 60, driveMinutes: 60 },
      { distanceKm: 0, driveMinutes: 0 },
    ]);
    expect(speed).toBeCloseTo(60, 5);
  });

  it("falls back to 55 km/h when no valid record exists", () => {
    expect(averageSpeedKmh([])).toBe(55);
    expect(averageSpeedKmh([{ distanceKm: 0, driveMinutes: 0 }])).toBe(55);
  });
});

describe("computeIsochroneRings", () => {
  it("computes a smaller inset (bigger ring) for a longer drive time", () => {
    const rings = computeIsochroneRings(
      [
        { minutes: 60, label: "1 H" },
        { minutes: 120, label: "2 H" },
      ],
      60, // 60 km/h
      120, // container half-width represents 120km
    );
    // 1h @ 60km/h = 60km radius = 50% of 120km -> inset = 50 - 25 = 25
    expect(rings[0].insetPercent).toBeCloseTo(25, 5);
    // 2h @ 60km/h = 120km radius = 100% of 120km -> inset = 50 - 50 = 0
    expect(rings[1].insetPercent).toBeCloseTo(0, 5);
    expect(rings[1].insetPercent).toBeLessThan(rings[0].insetPercent);
  });

  it("clamps inset to 0 when the ring would be bigger than the container", () => {
    const rings = computeIsochroneRings([{ minutes: 300, label: "5 H" }], 60, 60);
    expect(rings[0].insetPercent).toBe(0);
  });

  it("clamps inset to 50 for a near-zero drive time (never a negative radius)", () => {
    const rings = computeIsochroneRings([{ minutes: 0, label: "0" }], 60, 60);
    expect(rings[0].insetPercent).toBe(50);
  });

  it("preserves labels", () => {
    const rings = computeIsochroneRings([{ minutes: 60, label: "1 H" }], 60, 120);
    expect(rings[0].label).toBe("1 H");
  });

  it("throws for a non-positive map scale rather than silently producing nonsense", () => {
    expect(() => computeIsochroneRings([{ minutes: 60, label: "1 H" }], 60, 0)).toThrow();
    expect(() => computeIsochroneRings([{ minutes: 60, label: "1 H" }], 60, -5)).toThrow();
  });
});
