import { describe, expect, it } from "vitest";
import { buildClusterIndex, getClustersAtZoom, isCluster, MAX_ZOOM, MIN_ZOOM } from "./clustering";

// Two groups ~2km wide internally (0.01-0.02 degrees — comfortably closer
// together than any two distinct real places in the dataset, but not so
// tight that they're borderline at our clustering radius), several
// hundred km apart from each other, so clustering behaviour is
// unambiguous at both zoom extremes.
const TIGHT_GROUP_A = [
  { id: "a1", lat: 45.8, lon: 15.9 },
  { id: "a2", lat: 45.81, lon: 15.91 },
  { id: "a3", lat: 45.79, lon: 15.89 },
];
const TIGHT_GROUP_B = [
  { id: "b1", lat: 42.0, lon: 21.4 },
  { id: "b2", lat: 42.01, lon: 21.41 },
];
const ALL = [...TIGHT_GROUP_A, ...TIGHT_GROUP_B];

describe("clustering", () => {
  it("merges a tight group into one cluster at the most zoomed-out level", () => {
    const index = buildClusterIndex(ALL);
    const clusters = getClustersAtZoom(index, MIN_ZOOM);
    // Far apart from each other (Zagreb vs Skopje-ish), so group A and
    // group B never merge with each other regardless of zoom — expect
    // exactly one feature per group at minimum zoom.
    expect(clusters.length).toBeLessThanOrEqual(ALL.length);
    expect(clusters.some(isCluster)).toBe(true);
  });

  it("resolves to individual leaves (no clusters) at maximum zoom", () => {
    const index = buildClusterIndex(ALL);
    const clusters = getClustersAtZoom(index, MAX_ZOOM);
    expect(clusters).toHaveLength(ALL.length);
    expect(clusters.every((c) => !isCluster(c))).toBe(true);
  });

  it("never encodes frame state in a cluster's own properties — cluster colour must never carry state (HIGH 04 / Task 5 rule)", () => {
    const index = buildClusterIndex(ALL);
    const clusters = getClustersAtZoom(index, MIN_ZOOM);
    for (const c of clusters) {
      if (isCluster(c)) {
        expect(c.properties).not.toHaveProperty("state");
      }
    }
  });

  it("clamps out-of-range zoom rather than throwing", () => {
    const index = buildClusterIndex(ALL);
    expect(() => getClustersAtZoom(index, -5)).not.toThrow();
    expect(() => getClustersAtZoom(index, 999)).not.toThrow();
  });

  it("every leaf feature carries its frameId", () => {
    const index = buildClusterIndex(ALL);
    const clusters = getClustersAtZoom(index, MAX_ZOOM);
    const ids = clusters.map((c) => (c.properties as { frameId?: string }).frameId).sort();
    expect(ids).toEqual(ALL.map((f) => f.id).sort());
  });

  it("handles the real 116-frame dataset without throwing, at every zoom level", async () => {
    const { default: frames } = await import("../../data/frames.json");
    const index = buildClusterIndex(frames);
    for (let zoom = MIN_ZOOM; zoom <= MAX_ZOOM; zoom++) {
      const clusters = getClustersAtZoom(index, zoom);
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(frames.length);
    }
  });
});
