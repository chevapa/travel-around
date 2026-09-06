// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useMediaQuery, usePrefersReducedMotion } from "./motion";

/**
 * jsdom has no real matchMedia — this installs a controllable fake,
 * matching the real MediaQueryList event-listener shape
 * usePrefersReducedMotion/useMediaQuery rely on. `matches` is a live
 * getter, not a value snapshotted at creation time — the hooks read
 * `query.matches` from the one object they captured in their effect, so a
 * plain object literal's value would never appear to change no matter how
 * many "change" events fire.
 */
function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  })) as unknown as typeof window.matchMedia;
  return {
    setMatches: (next: boolean) => {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of the mock installed above
    delete window.matchMedia;
  });

  it("reflects the media query's initial value", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it("is false when the query doesn't match", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it("updates when the OS setting changes while mounted", () => {
    const mock = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    act(() => mock.setMatches(true));
    expect(result.current).toBe(true);
  });

  it("defaults to false without throwing when matchMedia is unavailable (e.g. some test environments)", () => {
    // @ts-expect-error -- simulating an environment without matchMedia
    window.matchMedia = undefined;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});

describe("useMediaQuery", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup
    delete window.matchMedia;
  });

  it("reflects the query's current match state", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("updates on change", () => {
    const mock = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));
    expect(result.current).toBe(false);
    act(() => mock.setMatches(true));
    expect(result.current).toBe(true);
  });
});
