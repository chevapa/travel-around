/**
 * Restyles a MapLibre GL map from a vector tile provider's default look to
 * RISO1's cream/greige palette — Task 5's conditional instruction, never
 * acted on until now: "If the app uses a real tile layer, the tiles must
 * be restyled to cream/greige — landcover desaturated, roads warm grey,
 * water a pale tint, POI icons off... No tile provider's default style
 * ships." Resolves the tile-provider question that had been open on epic
 * #84 since the epic was created.
 *
 * Provider: OpenFreeMap (https://openfreemap.org) — free, no API key, no
 * rate limit, licensed for exactly this kind of use (self-hostable, built
 * as a genuinely free alternative to Mapbox/MapTiler). Its "liberty"
 * style follows the standard OpenMapTiles schema, which is what the
 * `source-layer` names matched against below assume.
 *
 * Hex literals are unavoidable here — MapLibre's style spec takes real
 * colour values, not CSS custom properties — same reasoning as
 * src/lib/contrast.ts. Every value below is one of tokens/colors.css's
 * own colours, named in the comments; keep the two in sync by hand if the
 * tokens ever change.
 */
import type { Map as MapLibreMap } from "maplibre-gl";

const GROUND = "#E7DCC0"; // --paper-3
const WATER = "rgba(31,79,216,0.12)"; // --blue at a pale tint, per Task 5's "water a pale tint"
const ROAD = "#6a6046"; // --ink-40, "quiet ink" — warm grey
const BOUNDARY = "#cfc4a6"; // --hairline
const LABEL_TEXT = "#191510"; // --ink

// setPaintProperty/setLayoutProperty are typed against a specific layer's
// literal paint-property union (e.g. only "fill-color" for a fill layer),
// but this function applies different property names across many layer
// types generically by source-layer — hence the casts. The real safety
// net is the test suite driving this against real OpenFreeMap layer
// definitions, not the type checker.
function setPaintIfExists(map: MapLibreMap, layerId: string, prop: string, value: unknown) {
  if (map.getLayer(layerId)) {
    (map.setPaintProperty as (id: string, name: string, value: unknown) => void)(layerId, prop, value);
  }
}

function hideLayer(map: MapLibreMap, layerId: string) {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, "visibility", "none");
  }
}

/**
 * Applies the restyle to every layer in the currently-loaded style, keyed
 * by `source-layer` (the OpenMapTiles feature type) rather than by exact
 * layer id — "liberty" ships several landcover/landuse sub-layers (wood,
 * grass, residential, ...) that should all flatten to the same ground
 * tone, matching RISO1's "flat, unmixed" colour rule (readme.md).
 */
export function restyleToRiso(map: MapLibreMap): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;

    switch (layer.type) {
      case "background":
        setPaintIfExists(map, layer.id, "background-color", GROUND);
        break;
      case "raster":
        // The provider's shaded-relief backdrop — a stock cartographic
        // texture RISO1's "no tile provider's default style ships" rule
        // rules out wholesale, not just recolours.
        hideLayer(map, layer.id);
        break;
      case "fill":
      case "fill-extrusion":
        if (sourceLayer === "water") setPaintIfExists(map, layer.id, "fill-color", WATER);
        else if (sourceLayer === "landcover" || sourceLayer === "landuse" || sourceLayer === "park") setPaintIfExists(map, layer.id, "fill-color", GROUND);
        else if (sourceLayer === "building") hideLayer(map, layer.id); // stock 3D-map signature; simpler without it
        else if (sourceLayer === "aeroway") hideLayer(map, layer.id);
        break;
      case "line":
        if (sourceLayer === "waterway") setPaintIfExists(map, layer.id, "line-color", WATER);
        else if (sourceLayer === "transportation") setPaintIfExists(map, layer.id, "line-color", ROAD);
        else if (sourceLayer === "boundary") setPaintIfExists(map, layer.id, "line-color", BOUNDARY);
        else if (sourceLayer === "aeroway" || sourceLayer === "park") hideLayer(map, layer.id);
        break;
      case "symbol":
        // Place names (cities/towns) survive, recoloured to ink, for
        // geographic orientation — everything else is exactly the "POI
        // icons off" clutter the plan calls out by name.
        if (sourceLayer === "place") {
          setPaintIfExists(map, layer.id, "text-color", LABEL_TEXT);
          setPaintIfExists(map, layer.id, "text-halo-color", GROUND);
        } else {
          hideLayer(map, layer.id);
        }
        break;
    }
  }
}
