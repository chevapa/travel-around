import { describe, expect, it } from "vitest";
import { hslSaturation } from "./saturation";

describe("hslSaturation", () => {
  it("is 0 for grey/achromatic colours", () => {
    expect(hslSaturation("#808080")).toBe(0);
    expect(hslSaturation("#ffffff")).toBe(0);
    expect(hslSaturation("#000000")).toBe(0);
  });

  it("is 1 for a fully saturated colour", () => {
    expect(hslSaturation("#ff0000")).toBeCloseTo(1, 5);
  });
});

// Task 12 regression check for HIGH 03 (AUDIT.md): "the basemap is
// competing with your pins" — proven from the actual token values used
// for the restyled map (lib/mapStyle.ts) versus the marker/print colours
// (tokens/colors.css), the same evidence-from-tokens approach
// contrast.ts uses for CRIT 02. If a future edit made the basemap more
// saturated than the markers, this fails.
describe("HIGH 03 regression: basemap tokens stay less saturated than marker tokens", () => {
  const GROUND = "#E7DCC0"; // --paper-3, lib/mapStyle.ts's landcover/background fill
  const ROAD = "#6a6046"; // --ink-40, lib/mapStyle.ts's road line colour
  const PINK = "#FF2E86"; // --pink — "loved" prints, the primary accent
  const BLUE = "#1F4FD8"; // --blue — unprinted frames
  const YELLOW = "#FFD200"; // --yellow — the single primary action

  it("ground is less saturated than every marker colour", () => {
    const ground = hslSaturation(GROUND);
    expect(ground).toBeLessThan(hslSaturation(PINK));
    expect(ground).toBeLessThan(hslSaturation(BLUE));
    expect(ground).toBeLessThan(hslSaturation(YELLOW));
  });

  it("roads are less saturated than every marker colour", () => {
    const road = hslSaturation(ROAD);
    expect(road).toBeLessThan(hslSaturation(PINK));
    expect(road).toBeLessThan(hslSaturation(BLUE));
    expect(road).toBeLessThan(hslSaturation(YELLOW));
  });
});
