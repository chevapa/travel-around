// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrameStack } from "./FrameStack";

// Task 5: "FrameStack must stay visually quieter than any single Print —
// paper fill, ink outline, handwritten numeral. Do not colour it." (the
// HIGH 04 fix, see AUDIT.md).
describe("FrameStack", () => {
  it("never uses a saturated ink colour as a fill — only paper/print tones", () => {
    const { container } = render(<FrameStack count={4} />);
    const html = container.innerHTML;
    // The count numeral is allowed to be pink (handwritten ink), but no
    // element may be *filled* with pink/yellow/blue — that would make the
    // cluster louder than a Print, inverting the hierarchy again.
    expect(html).not.toMatch(/background:\s*var\(--(pink|yellow|blue|state-loved)\)/);
  });

  it("shows the count as a handwritten numeral", () => {
    const { getByText } = render(<FrameStack count={7} />);
    expect(getByText("7")).toBeInTheDocument();
  });

  it("keeps the tap target at --tap-min regardless of visual size", () => {
    const { container } = render(<FrameStack width={30} height={24} />);
    const style = container.firstElementChild?.getAttribute("style") ?? "";
    expect(style).toContain("min-width: var(--tap-min)");
    expect(style).toContain("min-height: var(--tap-min)");
  });
});
