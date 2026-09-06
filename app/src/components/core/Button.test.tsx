// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

// Task 3: "Button — add a dev-mode warning if more than one variant='primary'
// mounts per screen" (DESIGN_RISO1/IMPLEMENTATION_PLAN.md).
describe("Button primary-count dev warning", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not warn for a single mounted primary", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = render(<Button variant="primary">To Print →</Button>);
    expect(warn).not.toHaveBeenCalled();
    unmount();
  });

  it("warns when a second primary mounts at the same time", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount: unmountA } = render(<Button variant="primary">A</Button>);
    const { unmount: unmountB } = render(<Button variant="primary">B</Button>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/primary/i);
    unmountA();
    unmountB();
  });

  it("does not warn for multiple non-primary buttons", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Button variant="secondary">A</Button>);
    render(<Button variant="secondary">B</Button>);
    expect(warn).not.toHaveBeenCalled();
  });
});
