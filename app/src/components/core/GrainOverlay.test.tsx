// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GrainOverlay } from "./GrainOverlay";

// Task 3: "GrainOverlay — add a dev-mode warning if a second instance
// mounts anywhere in the tree" (DESIGN_RISO1/IMPLEMENTATION_PLAN.md).
describe("GrainOverlay dev warning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not warn for a single mounted instance", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = render(<GrainOverlay />);
    expect(warn).not.toHaveBeenCalled();
    unmount();
  });

  it("warns when a second instance mounts at the same time", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount: unmountA } = render(<GrainOverlay />);
    const { unmount: unmountB } = render(<GrainOverlay />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/grain/i);
    unmountA();
    unmountB();
  });
});
