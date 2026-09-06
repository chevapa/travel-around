import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// maplibre-gl resolves its worker script at runtime as a URL relative to
// its OWN module's import.meta.url (see its web_worker.ts). That's fine
// unmodified, but Vite's production build inlines maplibre-gl into the
// app's single bundle rather than emitting it as its own file, so at
// runtime import.meta.url points at .../assets/index-<hash>.js, and
// maplibre-gl goes looking for maplibre-gl-worker.mjs next to THAT —
// a file that was never emitted, so the request 404s and the map never
// renders (the RISO1 chrome mounts fine; only the map canvas stays
// empty).
//
// A plain `?url` import of node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs
// isn't enough to fix this on its own: that file itself does
// `import ... from "./maplibre-gl-shared.mjs"`, a relative import to a
// sibling file a bare `?url` copy doesn't bring along — the worker then
// fails inside its OWN thread trying to resolve that import, silently
// (nothing reaches the main thread's console at all; the map's "load"
// event just never fires). scripts/bundle-maplibre-worker.mjs flattens
// the worker and that one dependency into a single, import-free file
// (see its own comment) — `?url` on THAT file is what actually works,
// giving back a URL correctly resolved however deep the app is nested
// (e.g. under /riso1/). setWorkerUrl() then points maplibre-gl at it
// instead of letting it guess.
import maplibreWorkerUrl from "../../vendor/maplibre-gl-worker.bundled.mjs?url";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { attachLongPress } from "../../lib/longPress";
import { restyleToRiso } from "../../lib/mapStyle";
import type { GeoBounds } from "./projection";

setWorkerUrl(maplibreWorkerUrl);

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
  /** The real lat/lon currently at the centre of the viewport — used as a fallback location for New Frame when it's started from TopBar's button rather than a map long-press. */
  center: { lat: number; lon: number };
}

export interface MapBaseProps {
  /** Fit to this extent once, on load — the dataset's own bounding box (see projection.ts's computeBounds), not a guessed centre/zoom. */
  initialBounds: GeoBounds;
  styleUrl?: string;
  /** Task 10: "adding a place starts from a map long-press." Fired with the real lat/lon under the press. */
  onLongPress?: (point: { lat: number; lon: number }) => void;
  children?: (view: MapView) => ReactNode;
}

export function MapBase({ initialBounds, styleUrl = DEFAULT_STYLE_URL, onLongPress, children }: MapBaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [, bump] = useState(0);

  // A ref, not a dependency of the effect below — onLongPress is a fresh
  // closure every render (it captures AtlasScreen's current frames/slot),
  // but the map itself must only be created once.
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const map = new MapLibreMap({
      container,
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
    // Surface style/tile failures instead of silently leaving `ready`
    // false forever — every bit of chrome (TopBar, Legend, cards) is
    // gated on "load" firing (see the render below), so an unlogged
    // style error here reads to the user as a blank map with no UI at
    // all, with no clue why.
    map.on("error", (e) => {
      console.error("[MapBase] MapLibre error:", e.error);
    });
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

    // Task 10: "adding a place starts from a map long-press." MapLibre has
    // no long-press event of its own (click/dblclick/contextmenu only).
    const detachLongPress = attachLongPress(container, (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      const { lng, lat } = map.unproject([clientX - rect.left, clientY - rect.top]);
      onLongPressRef.current?.({ lat, lon: lng });
    });

    return () => {
      detachLongPress();
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
    center: (() => {
      const c = mapRef.current?.getCenter();
      return c ? { lat: c.lat, lon: c.lng } : { lat: 0, lon: 0 };
    })(),
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div ref={containerRef} data-testid="riso-map-container" style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{ready ? children?.(view) : null}</div>
    </div>
  );
}
