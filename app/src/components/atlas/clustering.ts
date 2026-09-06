/**
 * Task 9 (DESIGN_RISO1/IMPLEMENTATION_PLAN.md): "Real clustering
 * (supercluster or equivalent) rendering FrameStack for groups and Print
 * for leaves." Supercluster is the library the plan names directly — an
 * r-bush-indexed clustering library used by (among others) Mapbox GL, so
 * getClusters() is O(log n) per call rather than O(n) over all 116 frames,
 * which is what actually keeps re-clustering on zoom change cheap.
 *
 * Feature types are declared directly from `geojson` rather than through
 * `Supercluster.ClusterFeature<...>` — the namespace merge that
 * `export =`-style default import produces doesn't play well with
 * isolatedModules here, and the shape is simple enough to state plainly.
 */
import Supercluster from "supercluster";
import type { BBox, Feature, Point } from "geojson";
import type { Frame } from "../../model/frame";

export interface FrameProps {
  frameId: string;
}

export interface ClusterProps {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
}

// Two distinct feature types in a real union (not Feature<Point, A | B>,
// which doesn't distribute and so can't be narrowed by a type predicate)
// so isCluster() below can actually eliminate one arm for the other.
export type FrameFeature = Feature<Point, FrameProps>;
export type ClusterFeature = Feature<Point, ClusterProps>;
export type FrameClusterFeature = FrameFeature | ClusterFeature;

/**
 * Our zoom scale is 0 (most zoomed out) to this (most zoomed in) — see
 * AtlasScreen.tsx's scaleForZoom, which uses the same range for print
 * size. 16 is also supercluster's own default maxZoom, and matches
 * standard web-mercator "street level" — needed because clustering radius
 * is in pixels, and pixels-per-real-metre roughly doubles each zoom step
 * (at zoom 8 a 60px radius already covers ~25km at this latitude, which
 * would merge every place in the dataset into one blob).
 */
export const MAX_ZOOM = 16;
export const MIN_ZOOM = 0;

const WORLD_BBOX: BBox = [-180, -85, 180, 85];

export function buildClusterIndex(frames: Pick<Frame, "id" | "lat" | "lon">[], radius = 60) {
  const index = new Supercluster<FrameProps>({ radius, minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM });
  index.load(
    frames.map((f) => ({
      type: "Feature",
      properties: { frameId: f.id },
      geometry: { type: "Point", coordinates: [f.lon, f.lat] },
    })),
  );
  return index;
}

export type ClusterIndex = ReturnType<typeof buildClusterIndex>;

export function getClustersAtZoom(index: ClusterIndex, zoom: number): FrameClusterFeature[] {
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
  return index.getClusters(WORLD_BBOX, clamped) as FrameClusterFeature[];
}

export function isCluster(feature: FrameClusterFeature): feature is ClusterFeature {
  return (feature.properties as ClusterProps).cluster === true;
}
