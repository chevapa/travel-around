// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapBase, type MapView } from "./MapBase";

const BOUNDS = { minLat: 42.0, maxLat: 46.0, minLon: 14.5, maxLon: 21.4 };

describe("MapBase", () => {
  it("calls children with a view once ready (the fake map resolves 'load' synchronously — see mockMapLibre.ts)", () => {
    const renderChild = vi.fn(() => <div>content</div>);
    render(<MapBase initialBounds={BOUNDS}>{renderChild}</MapBase>);
    expect(renderChild).toHaveBeenCalled();
  });

  it("renders without children without crashing", () => {
    const { container } = render(<MapBase initialBounds={BOUNDS} />);
    expect(container).toBeTruthy();
  });

  it("view.project returns a finite pixel position", () => {
    render(
      <MapBase initialBounds={BOUNDS}>
        {(view) => {
          const p = view.project({ lat: 45.8, lon: 15.9 });
          expect(p).not.toBeNull();
          expect(Number.isFinite(p!.x)).toBe(true);
          expect(Number.isFinite(p!.y)).toBe(true);
          return <div>ok</div>;
        }}
      </MapBase>,
    );
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
});
