// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeMapLibreMap } from "../../test/mockMapLibre";
import { MapBase, type MapView } from "./MapBase";

const BOUNDS = { minLat: 42.0, maxLat: 46.0, minLon: 14.5, maxLon: 21.4 };

describe("MapBase", () => {
  it("calls children with a view once ready (the fake map resolves 'load' synchronously — see mockMapLibre.ts)", () => {
    const renderChild = vi.fn(() => <div>content</div>);
    render(<MapBase initialBounds={BOUNDS}>{renderChild}</MapBase>);
    expect(renderChild).toHaveBeenCalled();
  });

  it("calls children even before 'load' fires — a slow/failed tile load must not hide the whole chrome (TopBar/Legend/panel slot all compose from this render-prop)", () => {
    const originalOn = FakeMapLibreMap.prototype.on;
    const onSpy = vi.spyOn(FakeMapLibreMap.prototype, "on").mockImplementation(function (this: FakeMapLibreMap, event: string, cb: (...a: unknown[]) => void) {
      if (event === "load") return this; // simulate "load" never firing
      return originalOn.call(this, event, cb);
    });
    const renderChild = vi.fn(() => <div>content</div>);
    render(<MapBase initialBounds={BOUNDS}>{renderChild}</MapBase>);
    expect(renderChild).toHaveBeenCalled();
    onSpy.mockRestore();
  });

  it("renders without children without crashing", () => {
    const { container } = render(<MapBase initialBounds={BOUNDS} />);
    expect(container).toBeTruthy();
  });

  it("view.project returns a finite pixel position once ready", () => {
    // Children are now called on every render, including the first one
    // (before 'load' fires — see MapBase.tsx's own comment on why), so
    // asserting inside the render-prop itself would run against that
    // first, not-yet-ready view too. Capture the latest one instead and
    // assert after render() returns, once the fake's synchronous 'load'
    // has flipped `ready` — same pattern as "zoomIn/zoomOut/flyTo don't
    // throw" below.
    let latestView: MapView | undefined;
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          latestView = view;
          return <div>ok</div>;
        }}
      </MapBase>,
    );
    const p = latestView!.project({ lat: 45.8, lon: 15.9 });
    expect(p).not.toBeNull();
    expect(Number.isFinite(p!.x)).toBe(true);
    expect(Number.isFinite(p!.y)).toBe(true);
  });

  it("returns null before 'load' fires — callers must handle an unready view rather than assuming one always comes back", () => {
    const originalOn = FakeMapLibreMap.prototype.on;
    const onSpy = vi.spyOn(FakeMapLibreMap.prototype, "on").mockImplementation(function (this: FakeMapLibreMap, event: string, cb: (...a: unknown[]) => void) {
      if (event === "load") return this;
      return originalOn.call(this, event, cb);
    });
    let latestView: MapView | undefined;
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          latestView = view;
          return <div>ok</div>;
        }}
      </MapBase>,
    );
    expect(latestView!.project({ lat: 45.8, lon: 15.9 })).toBeNull();
    onSpy.mockRestore();
  });

  it("exposes a real zoom number", () => {
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          expect(typeof view.zoom).toBe("number");
          return <div>ok</div>;
        }}
      </MapBase>,
    );
  });

  it("zoomIn/zoomOut/flyTo don't throw", () => {
    // Captured and called *after* render completes, not from inside the
    // render-prop body — calling them there would call setState (via the
    // fake's zoom/move event emit) during render itself, tripping React's
    // "too many re-renders" guard. Real usage only ever calls these from
    // event handlers, never synchronously during render.
    let captured: MapView | undefined;
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          captured = view;
          return <div>ok</div>;
        }}
      </MapBase>,
    );
    expect(() => captured!.zoomIn()).not.toThrow();
    expect(() => captured!.zoomOut()).not.toThrow();
    expect(() => captured!.flyTo({ lat: 45.8, lon: 15.9 }, 10)).not.toThrow();
  });

  it("cleans up the map on unmount without throwing", async () => {
    const { unmount } = render(<MapBase initialBounds={BOUNDS}>{() => <div>ok</div>}</MapBase>);
    expect(() => unmount()).not.toThrow();
    await waitFor(() => expect(true).toBe(true)); // flush any pending effects
  });

  it("exposes the real map centre", () => {
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          expect(typeof view.center.lat).toBe("number");
          expect(typeof view.center.lon).toBe("number");
          return <div>ok</div>;
        }}
      </MapBase>,
    );
  });
});

// Task 10: "adding a place starts from a map long-press."
describe("MapBase — long-press (Task 10)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires onLongPress with a real lat/lon after holding on the map container", () => {
    const onLongPress = vi.fn();
    const { getByTestId } = render(<MapBase initialBounds={BOUNDS} onLongPress={onLongPress} />);
    const mapContainer = getByTestId("riso-map-container");
    // The fake's unproject() is the exact inverse of its project() — see
    // mockMapLibre.ts — so this specific clientX/Y round-trips predictably.
    mapContainer.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    mapContainer.dispatchEvent(new PointerEvent("pointerdown", { clientX: 200, clientY: 200, pointerType: "touch" }));
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledWith({ lat: 0, lon: 0 });
  });

  it("does not fire for a quick tap", () => {
    const onLongPress = vi.fn();
    const { getByTestId } = render(<MapBase initialBounds={BOUNDS} onLongPress={onLongPress} />);
    const mapContainer = getByTestId("riso-map-container");
    mapContainer.dispatchEvent(new PointerEvent("pointerdown", { clientX: 200, clientY: 200 }));
    mapContainer.dispatchEvent(new PointerEvent("pointerup"));
    vi.advanceTimersByTime(500);
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
