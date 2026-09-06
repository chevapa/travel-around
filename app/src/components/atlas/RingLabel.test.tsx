// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { computeIsochroneRings } from "./isochrone";
import { RingLabel, RingSet } from "./RingLabel";

describe("RingLabel", () => {
  it("renders its children as the pennant text", () => {
    render(<RingLabel>2 H</RingLabel>);
    expect(screen.getByText("2 H")).toBeInTheDocument();
  });
});

describe("RingSet", () => {
  it("renders one dashed ring and one pennant label per computed ring", () => {
    const rings = computeIsochroneRings(
      [
        { minutes: 60, label: "1 H" },
        { minutes: 120, label: "2 H" },
      ],
      60,
      120,
    );
    render(
      <div style={{ position: "relative" }}>
        <RingSet rings={rings} />
      </div>,
    );
    expect(screen.getByText("1 H")).toBeInTheDocument();
    expect(screen.getByText("2 H")).toBeInTheDocument();
  });

  it("places the pennant at the ring's own inset (left edge), per the design rule", () => {
    const rings = computeIsochroneRings([{ minutes: 60, label: "1 H" }], 60, 120);
    render(
      <div style={{ position: "relative" }}>
        <RingSet rings={rings} />
      </div>,
    );
    const label = screen.getByText("1 H");
    expect(label.getAttribute("style")).toContain(`left: ${rings[0].insetPercent}%`);
  });

  it("skips the pennant when a ring has no label", () => {
    const { container } = render(
      <div style={{ position: "relative" }}>
        <RingSet rings={[{ insetPercent: 10, label: "" }]} />
      </div>,
    );
    // Only the dashed ring <span>, no pennant text node.
    expect(container.textContent).toBe("");
  });
});
