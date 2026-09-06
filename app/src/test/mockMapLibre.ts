/**
 * A minimal stand-in for maplibre-gl's Map, registered globally (see
 * setup.ts) since jsdom has no WebGL2 — real MapLibre throws
 * GPUInitializationError on construction there. Anything that needs to
 * exercise the actual restyle/rendering behaviour does so against a real
 * headless Chromium instead (see the PR description for this task);
 * this fake only needs to be complete enough that components built on
 * top of MapBase (AtlasScreen) behave the same way they would once the
 * real map is ready.
 *
 * `on('load', cb)` invokes `cb` immediately/synchronously rather than
 * storing it — the real event is asynchronous (tiles have to actually
 * load), but every existing test assumes content is present immediately
 * after `render()`, matching how the whole app behaved before this map
 * existed. Simulating "already loaded" is the option that doesn't require
 * rewriting every test to `await waitFor(...)`.
 */
type Listener = (...args: unknown[]) => void;

export class FakeMapLibreMap {
  private listeners: Record<string, Listener[]> = {};
  private zoomLevel = 9; // arbitrary; matches the old synthetic DEFAULT_ZOOM for continuity

  constructor(_options: unknown) {}

  on(event: string, cb: Listener) {
    if (event === "load") {
      cb();
      return this;
    }
    (this.listeners[event] ??= []).push(cb);
    return this;
  }

  off(event: string, cb: Listener) {
    this.listeners[event] = (this.listeners[event] ?? []).filter((l) => l !== cb);
    return this;
  }

  private emit(event: string) {
    for (const cb of this.listeners[event] ?? []) cb();
  }

  remove() {}

  // Deterministic but distinguishable per point, so different frames end
  // up at different (fake) screen positions rather than stacking exactly.
  project([lon, lat]: [number, number]) {
    return { x: 200 + lon * 4, y: 200 - lat * 4 };
  }

  getZoom() {
    return this.zoomLevel;
  }

  zoomIn() {
    this.zoomLevel += 1;
    this.emit("zoom");
  }

  zoomOut() {
    this.zoomLevel -= 1;
    this.emit("zoom");
  }

  flyTo(opts: { zoom?: number }) {
    if (opts.zoom != null) this.zoomLevel = opts.zoom;
    this.emit("move");
    this.emit("zoom");
  }

  fitBounds() {}

  getStyle() {
    return { layers: [] };
  }

  getLayer() {
    return undefined;
  }

  setPaintProperty() {}
  setLayoutProperty() {}
}
