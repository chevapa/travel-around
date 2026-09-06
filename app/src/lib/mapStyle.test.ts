import { describe, expect, it } from "vitest";
import { restyleToRiso } from "./mapStyle";
import type { Map as MapLibreMap } from "maplibre-gl";

interface FakeLayer {
  id: string;
  type: string;
  "source-layer"?: string;
}

/**
 * A minimal stand-in for maplibre-gl's Map — real MapLibre needs a WebGL
 * context jsdom doesn't have, so restyleToRiso's logic is verified against
 * a fake that just records the calls it receives, keyed by real layer
 * definitions pulled from OpenFreeMap's actual "liberty" style (see the
 * curl command in the PR description) rather than invented ones.
 */
function fakeMap(layers: FakeLayer[]) {
  const paint: Record<string, Record<string, unknown>> = {};
  const layout: Record<string, Record<string, unknown>> = {};
  const byId = new Map(layers.map((l) => [l.id, l]));

  const map = {
    getStyle: () => ({ layers }),
    getLayer: (id: string) => byId.get(id),
    setPaintProperty: (id: string, prop: string, value: unknown) => {
      paint[id] ??= {};
      paint[id][prop] = value;
    },
    setLayoutProperty: (id: string, prop: string, value: unknown) => {
      layout[id] ??= {};
      layout[id][prop] = value;
    },
  } as unknown as MapLibreMap;

  return { map, paint, layout };
}

const REAL_LAYER_SAMPLE: FakeLayer[] = [
  { id: "background", type: "background" },
  { id: "natural_earth", type: "raster" },
  { id: "park", type: "fill", "source-layer": "park" },
  { id: "landuse_residential", type: "fill", "source-layer": "landuse" },
  { id: "landcover_wood", type: "fill", "source-layer": "landcover" },
  { id: "water", type: "fill", "source-layer": "water" },
  { id: "waterway_tunnel", type: "line", "source-layer": "waterway" },
  { id: "tunnel_motorway_link_casing", type: "line", "source-layer": "transportation" },
  { id: "building", type: "fill", "source-layer": "building" },
  { id: "building-3d", type: "fill-extrusion", "source-layer": "building" },
  { id: "boundary_3", type: "line", "source-layer": "boundary" },
  { id: "poi_r20", type: "symbol", "source-layer": "poi" },
  { id: "highway-name-path", type: "symbol", "source-layer": "transportation_name" },
  { id: "airport", type: "symbol", "source-layer": "aerodrome_label" },
  { id: "label_other", type: "symbol", "source-layer": "place" },
];

describe("restyleToRiso", () => {
  it("sets the background to the ground token", () => {
    const { map, paint } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(paint.background["background-color"]).toBe("#E7DCC0");
  });

  it("hides the stock shaded-relief raster layer entirely", () => {
    const { map, layout } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(layout.natural_earth.visibility).toBe("none");
  });

  it("flattens every landcover/landuse/park sub-layer to the same ground tone", () => {
    const { map, paint } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(paint.park["fill-color"]).toBe("#E7DCC0");
    expect(paint.landuse_residential["fill-color"]).toBe("#E7DCC0");
    expect(paint.landcover_wood["fill-color"]).toBe("#E7DCC0");
  });

  it("tints water pale, not the provider's saturated blue", () => {
    const { map, paint } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(paint.water["fill-color"]).toBe("rgba(31,79,216,0.12)");
    expect(paint.waterway_tunnel["line-color"]).toBe("rgba(31,79,216,0.12)");
  });

  it("recolours roads warm grey", () => {
    const { map, paint } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(paint.tunnel_motorway_link_casing["line-color"]).toBe("#6a6046");
  });

  it("hides buildings — both flat and 3D — rather than recolouring the stock-map signature", () => {
    const { map, layout } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(layout.building.visibility).toBe("none");
    expect(layout["building-3d"].visibility).toBe("none");
  });

  it("drops POI icons, street-name labels, and airport labels — the 'POI icons off' rule", () => {
    const { map, layout } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(layout.poi_r20.visibility).toBe("none");
    expect(layout["highway-name-path"].visibility).toBe("none");
    expect(layout.airport.visibility).toBe("none");
  });

  it("keeps place labels for orientation, recoloured to ink on a ground-toned halo", () => {
    const { map, paint, layout } = fakeMap(REAL_LAYER_SAMPLE);
    restyleToRiso(map);
    expect(layout.label_other?.visibility).not.toBe("none");
    expect(paint.label_other["text-color"]).toBe("#191510");
    expect(paint.label_other["text-halo-color"]).toBe("#E7DCC0");
  });

  it("does nothing and does not throw when the style has no layers yet", () => {
    const { map } = fakeMap([]);
    expect(() => restyleToRiso(map)).not.toThrow();
  });

  it("is a no-op, not a throw, when getStyle() returns undefined (called too early)", () => {
    const map = { getStyle: () => undefined } as unknown as MapLibreMap;
    expect(() => restyleToRiso(map)).not.toThrow();
  });
});
