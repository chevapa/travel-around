import { describe, expect, it } from "vitest";
import { averageSpeedKmh, computeIsochroneRings, destPoint, ovalOutline, ringKmAt, ZAGREB_DRIVE_RINGS } from "./isochrone";
import { HOME } from "../../model/migrate";

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

// Issue 126: "the circles are wrong completely, there are only 2 and
// should be 3... study exactly how the circles on old map being drawn" —
// ported directly from js/map.js's RING_DATA/destPoint/ringKmAt/ovalPoints.
describe("ZAGREB_DRIVE_RINGS", () => {
  it("has exactly three rings, not two", () => {
    expect(ZAGREB_DRIVE_RINGS).toHaveLength(3);
    expect(ZAGREB_DRIVE_RINGS.map((r) => r.label)).toEqual(["1 H", "2 H", "3 H"]);
  });

  it("is calibrated so the 1h ring's due-south edge sits closer to home than the 2h ring's does, in every direction", () => {
    const [oneHour, twoHour] = ZAGREB_DRIVE_RINGS;
    for (const bearing of [0, 90, 180, 270]) {
      expect(ringKmAt(oneHour, bearing)).toBeLessThan(ringKmAt(twoHour, bearing));
    }
  });
});

describe("ringKmAt", () => {
  const ring = { label: "test", n: 100, e: 200, s: 300, w: 400 };

  it("returns the exact calibrated value at each cardinal bearing", () => {
    expect(ringKmAt(ring, 0)).toBeCloseTo(100, 5); // N
    expect(ringKmAt(ring, 90)).toBeCloseTo(200, 5); // E
    expect(ringKmAt(ring, 180)).toBeCloseTo(300, 5); // S
    expect(ringKmAt(ring, 270)).toBeCloseTo(400, 5); // W
  });

  it("interpolates smoothly (monotonically) between two cardinal points, not linearly-with-a-kink", () => {
    const quarterStep = ringKmAt(ring, 45);
    expect(quarterStep).toBeGreaterThan(100);
    expect(quarterStep).toBeLessThan(200);
  });

  it("wraps at 360°, matching the same bearing modulo 360", () => {
    expect(ringKmAt(ring, 360)).toBeCloseTo(ringKmAt(ring, 0), 5);
    expect(ringKmAt(ring, 405)).toBeCloseTo(ringKmAt(ring, 45), 5);
  });
});

describe("destPoint", () => {
  it("moving due north increases latitude only", () => {
    const p = destPoint(HOME, 100, 0);
    expect(p.lat).toBeGreaterThan(HOME.lat);
    expect(p.lon).toBeCloseTo(HOME.lon, 5);
  });

  it("moving due east increases longitude only", () => {
    const p = destPoint(HOME, 100, 90);
    expect(p.lon).toBeGreaterThan(HOME.lon);
    expect(p.lat).toBeCloseTo(HOME.lat, 5);
  });

  it("0 km is a no-op regardless of bearing", () => {
    const p = destPoint(HOME, 0, 137);
    expect(p.lat).toBeCloseTo(HOME.lat, 9);
    expect(p.lon).toBeCloseTo(HOME.lon, 9);
  });
});

describe("ovalOutline", () => {
  it("returns `steps` points, each a valid lat/lon", () => {
    const points = ovalOutline(HOME, ZAGREB_DRIVE_RINGS[0], 36);
    expect(points).toHaveLength(36);
    for (const p of points) {
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lon)).toBe(true);
    }
  });

  it("every point is roughly centred on the origin, not off to one side", () => {
    const points = ovalOutline(HOME, ZAGREB_DRIVE_RINGS[1]);
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    expect(Math.min(...lats)).toBeLessThan(HOME.lat);
    expect(Math.max(...lats)).toBeGreaterThan(HOME.lat);
    expect(Math.min(...lons)).toBeLessThan(HOME.lon);
    expect(Math.max(...lons)).toBeGreaterThan(HOME.lon);
  });
});
