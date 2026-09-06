/**
 * Task 8 (DESIGN_RISO1/IMPLEMENTATION_PLAN.md): "replacing [the reference
 * AtlasScreen's] mock positions with projected coordinates from lat/lon."
 *
 * This is deliberately a simple linear (equirectangular-ish) projection,
 * not a real map projection — consistent with the rest of RISO1's
 * cartography, which is stylized rather than GIS-accurate (see
 * isochrone.ts's own scope note). It maps whatever bounding box the
 * frames actually span onto a padded percentage box, so every frame lands
 * somewhere sane regardless of how far the dataset's extent runs (this
 * dataset spans Zagreb day trips to Skopje and Berat — see migrate.ts).
 */
export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/** The bounding box of a set of points. Degenerates gracefully (a single point, or all points identical) rather than dividing by zero downstream. */
export function computeBounds(points: GeoPoint[]): GeoBounds {
  if (points.length === 0) {
    throw new Error("computeBounds: at least one point is required");
  }
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLon = points[0].lon;
  let maxLon = points[0].lon;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

export interface ProjectedPoint {
  /** Percent from the left edge, 0-100. */
  x: number;
  /** Percent from the top edge, 0-100 — latitude is inverted here, since higher latitude (further north) belongs nearer the top of the screen, the opposite of increasing screen-y. */
  y: number;
}

/**
 * Projects a lat/lon point into a percentage position within `bounds`,
 * inset by `marginPercent` on every side so points at the extreme edge of
 * the data aren't drawn flush against the container's edge.
 */
/**
 * Standard web-mercator ground resolution: real-world metres covered by
 * one screen pixel at a given latitude and zoom level. 156543.03392 is the
 * well-known constant (2·π·6378137 / 256, Earth's circumference in metres
 * divided by the 256px tile size). Used to size real-world distances (an
 * isochrone ring's radius) correctly on a real, zoomable map — see
 * AtlasScreen.tsx.
 */
export function metersPerPixel(latDeg: number, zoom: number): number {
  const latRad = (latDeg * Math.PI) / 180;
  return (156543.03392 * Math.cos(latRad)) / 2 ** zoom;
}

export function projectToPercent(point: GeoPoint, bounds: GeoBounds, marginPercent = 8): ProjectedPoint {
  const latRange = bounds.maxLat - bounds.minLat;
  const lonRange = bounds.maxLon - bounds.minLon;
  // A single point (or a set of identical points) has zero range in one or
  // both axes — center it rather than producing NaN from a 0/0 division.
  const xFrac = lonRange === 0 ? 0.5 : (point.lon - bounds.minLon) / lonRange;
  const yFrac = latRange === 0 ? 0.5 : (bounds.maxLat - point.lat) / latRange;
  const usable = 100 - marginPercent * 2;
  return {
    x: marginPercent + xFrac * usable,
    y: marginPercent + yFrac * usable,
  };
}
