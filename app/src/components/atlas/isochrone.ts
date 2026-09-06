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
