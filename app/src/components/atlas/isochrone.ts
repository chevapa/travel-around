/**
 * Real drive-time ring math (Task 5, DESIGN_RISO1/IMPLEMENTATION_PLAN.md):
 * "RingSet percentages in the reference are a mock. Replace with real
 * isochrones (or drive-time-radius circles) computed from driveMinutes."
 *
 * Honest scope note: a true isochrone needs a real map projection (how
 * many real-world km a pixel/percent of the container covers), which
 * doesn't exist until Task 8 projects frame lat/lon onto the Atlas. What's
 * genuinely available now is the average driving speed implied by the
 * dataset itself — this file computes that, and turns a set of drive-time
 * thresholds into ring radii once a map scale is supplied.
 */
import type { Frame } from "../../model/frame";
import type { GeoPoint } from "./projection";

/** Fallback used only when no frame has both a real distance and a real drive time. Matches migrate.ts's own assumption, for consistency. */
const FALLBACK_AVG_SPEED_KMH = 55;

/**
 * Average implied driving speed across a set of frames (km / h). Not a
 * fixed constant — it's derived from this specific dataset's own
 * distanceKm/driveMinutes pairs, so it reflects how these day trips are
 * actually driven (mixed motorway + local roads), not a generic assumption.
 */
export function averageSpeedKmh(frames: Pick<Frame, "distanceKm" | "driveMinutes">[]): number {
  const valid = frames.filter((f) => f.driveMinutes > 0 && f.distanceKm > 0);
  if (valid.length === 0) return FALLBACK_AVG_SPEED_KMH;
  const total = valid.reduce((sum, f) => sum + f.distanceKm / (f.driveMinutes / 60), 0);
  return total / valid.length;
}

export interface IsochroneSpec {
  minutes: number;
  label: string;
}

export interface Ring {
  /** Percentage inset from every edge of the container — RingSet applies this symmetrically (top = right = bottom = left), producing a circle when the container is square. */
  insetPercent: number;
  label: string;
}

/**
 * Converts drive-time thresholds into ring insets, given how many km the
 * container's half-width represents at the Atlas's current scale
 * (`kmPerContainerHalf` — supplied by the map/projection layer, Task 8+;
 * there's no sane default because it's meaningless without a real
 * projection). Clamped to [0, 50] — a ring bigger than the container just
 * fills it rather than overflowing oddly.
 */
export function computeIsochroneRings(specs: IsochroneSpec[], avgSpeedKmh: number, kmPerContainerHalf: number): Ring[] {
  if (kmPerContainerHalf <= 0) {
    throw new Error(`computeIsochroneRings: kmPerContainerHalf must be positive, got ${kmPerContainerHalf}`);
  }
  return specs.map(({ minutes, label }) => {
    const radiusKm = avgSpeedKmh * (minutes / 60);
    const radiusPercent = (radiusKm / kmPerContainerHalf) * 50;
    const insetPercent = Math.max(0, Math.min(50, 50 - radiusPercent));
    return { insetPercent, label };
  });
}

/**
 * Real drive-time rings (issue 126: "the circles are wrong completely,
 * there are only 2 and should be 3... study exactly how the circles on
 * old map being drawn"). The single-radius circle above (`averageSpeedKmh`
 * + `computeIsochroneRings`) was a reasonable approximation before a real
 * map existed to project onto, but it can't reproduce the live site's
 * actual rings: those are per-direction ovals, calibrated against real
 * observed drive times, not a derived average speed. Real driving speed
 * genuinely isn't isotropic around Zagreb — motorways run faster toward
 * some destinations than the hills/local roads toward others — so a
 * circle necessarily gets *some* direction wrong (issue 126's concrete
 * example: the old uniform-radius circle put its 2h edge over Karlovac,
 * which is a real 1h drive).
 *
 * Ported directly from the live site's js/map.js (`RING_DATA`, `destPoint`,
 * `ringKmAt`, `ovalPoints` — see that file's own comment for the specific
 * reference points/times each ring was calibrated against): straight-line
 * (not road-network) distance in four compass directions, smoothly
 * interpolated between them by bearing.
 */
export interface DirectionalRingSpec {
  label: string;
  /** Calibrated straight-line km at due north/east/south/west from the origin. */
  n: number;
  e: number;
  s: number;
  w: number;
}

/** The live site's three Zagreb rings — js/map.js RING_DATA.zagreb, unchanged. */
export const ZAGREB_DRIVE_RINGS: DirectionalRingSpec[] = [
  { label: "1 H", n: 61, e: 72, s: 47, w: 63 },
  { label: "2 H", n: 146, e: 180, s: 107, w: 137 },
  { label: "3 H", n: 200, e: 225, s: 197, w: 214 },
];

/** Smoothstep interpolation — matches js/map.js's smoothLerp exactly, so the oval has the same soft corners at the N/E/S/W seams rather than a linear kink. */
function smoothLerp(a: number, b: number, t: number): number {
  const s = t * t * (3 - 2 * t);
  return a + (b - a) * s;
}

/** Straight-line km at compass bearing `bearingDeg` (0 = north, clockwise) around the directional oval `ring` describes — js/map.js's ringKmAt, unchanged. */
export function ringKmAt(ring: DirectionalRingSpec, bearingDeg: number): number {
  const b = ((bearingDeg % 360) + 360) % 360;
  if (b <= 90) return smoothLerp(ring.n, ring.e, b / 90);
  if (b <= 180) return smoothLerp(ring.e, ring.s, (b - 90) / 90);
  if (b <= 270) return smoothLerp(ring.s, ring.w, (b - 180) / 90);
  return smoothLerp(ring.w, ring.n, (b - 270) / 90);
}

/**
 * A point `km` away from `origin` at compass bearing `bearingDeg` — a flat
 * (equirectangular) approximation, same as js/map.js's destPoint. Accurate
 * enough at day-trip distances (tens to a few hundred km); not meant for
 * anything close to intercontinental.
 */
export function destPoint(origin: GeoPoint, km: number, bearingDeg: number): GeoPoint {
  const rad = (bearingDeg * Math.PI) / 180;
  const latRad = (origin.lat * Math.PI) / 180;
  return {
    lat: origin.lat + (km * Math.cos(rad)) / 111.32,
    lon: origin.lon + (km * Math.sin(rad)) / (111.32 * Math.cos(latRad)),
  };
}

/** The oval's outline as real lat/lon points, evenly spaced by bearing — js/map.js's ovalPoints, projected via real map coordinates instead of Leaflet's. */
export function ovalOutline(origin: GeoPoint, ring: DirectionalRingSpec, steps = 72): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const bearing = (i * 360) / steps;
    points.push(destPoint(origin, ringKmAt(ring, bearing), bearing));
  }
  return points;
}
