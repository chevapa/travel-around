import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { restyleToRiso } from "../../lib/mapStyle";
import type { GeoBounds } from "./projection";

/**
 * The real, restyled basemap — resolves the tile-provider question that
 * had been open on epic #84 since the epic began. Real pan/zoom, real
 * coastlines and roads, restyled to RISO1's palette (see lib/mapStyle.ts)
 * rather than shipping any tile provider's default look, per Task 5's
 * conditional instruction.
 *
 * Provider: OpenFreeMap's "liberty" style — free, no API key, no rate
 * limit (https://openfreemap.org). MapLibre GL JS itself is BSD-3-Clause.
 */
const DEFAULT_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export interface MapView {
  /** Projects a real lat/lon to the current on-screen pixel position, or null before the map is ready. */
  project: (point: { lat: number; lon: number }) => { x: number; y: number } | null;
  /** The map's real, continuous zoom level (matches standard web-mercator zoom — the same scale clustering.ts's supercluster expects). */
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Pans and zooms to centre on a point — used when a specific frame needs to be guaranteed visible (e.g. "To Print"). */
  flyTo: (point: { lat: number; lon: number }, zoom?: number) => void;
}

export interface MapBaseProps {
  /** Fit to this extent once, on load — the dataset's own bounding box (see projection.ts's computeBounds), not a guessed centre/zoom. */
  initialBounds: GeoBounds;
  styleUrl?: string;
  children?: (view: MapView) => ReactNode;
}

export function MapBase({ initialBounds, styleUrl = DEFAULT_STYLE_URL, children }: MapBaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [0, 0],
      zoom: 0,
      attributionControl: false,
    });
    mapRef.current = map;

    const rerender = () => bump((n) => n + 1);
    map.on("move", rerender);
    map.on("zoom", rerender);
    map.on("resize", rerender);
    map.on("load", () => {
      map.fitBounds(
        [
          [initialBounds.minLon, initialBounds.minLat],
          [initialBounds.maxLon, initialBounds.maxLat],
        ],
        { padding: 40, animate: false },
      );
      restyleToRiso(map);
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; initialBounds/styleUrl are the *initial* view only, deliberately not reactive
  }, []);

  const view: MapView = {
    project: (point) => {
      const map = mapRef.current;
      if (!map || !ready) return null;
      const p = map.project([point.lon, point.lat]);
      return { x: p.x, y: p.y };
    },
    zoom: mapRef.current?.getZoom() ?? 0,
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
    flyTo: (point, zoom) => mapRef.current?.flyTo({ center: [point.lon, point.lat], zoom }),
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{ready ? children?.(view) : null}</div>
    </div>
  );
}
