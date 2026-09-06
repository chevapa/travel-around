// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar — action hierarchy", () => {
  it("orders actions icon -> secondary -> invert -> primary, left to right", () => {
    render(<TopBar meta="Zagreb · 42 printed / 74 not" filterCount={2} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "⌕", // IconButton — aria-hidden only affects the a11y tree, not textContent
      "New Frame",
      "The Index2", // badge renders as a sibling span inside the button
      "To Print →",
    ]);
  });

  it("has exactly one primary (yellow) button by default", () => {
    const { container } = render(<TopBar />);
    // Button's own dev-mode warning already guards "more than one primary
    // mounted"; this just confirms TopBar itself only ever renders the one.
    const primaryLikeButtons = Array.from(container.querySelectorAll("button")).filter((b) =>
      (b.getAttribute("style") ?? "").includes("var(--action-primary)"),
    );
    expect(primaryLikeButtons).toHaveLength(1);
    expect(primaryLikeButtons[0].textContent).toBe("To Print →");
  });

  it("shows the filter badge on The Index when filterCount is set", () => {
    render(<TopBar filterCount={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("omits the badge when filterCount is zero or unset", () => {
    render(<TopBar filterCount={0} />);
    expect(screen.queryByText("0")).toBeNull();
  });
});

// Matches a real `transform:` declaration but not `text-transform:` —
// CSS's text-transform contains "transform" as a substring, so a plain
// .not.toContain("transform") false-positives on it.
const TRANSFORM_DECLARATION = /(^|;)\s*transform\s*:/;

describe("TopBar — never rotates", () => {
  it("sets no transform on the bar or any of its direct children", () => {
    const { container } = render(<TopBar meta="Zagreb · 42 printed / 74 not" filterCount={1} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.getAttribute("style") ?? "").not.toMatch(TRANSFORM_DECLARATION);
    const allDescendants = bar.querySelectorAll("*");
    for (const el of Array.from(allDescendants)) {
      expect(el.getAttribute("style") ?? "").not.toMatch(TRANSFORM_DECLARATION);
    }
  });
});

describe("TopBar — layout resilience (see plan: 'no overflow at 1440/1024/375px')", () => {
  it("lets the bar wrap as whole groups rather than breaking action order", () => {
    const { container } = render(<TopBar />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.getAttribute("style")).toContain("flex-wrap: wrap");
  });

  it("keeps a long brand name on one line and lets long meta text truncate, rather than overflow", () => {
    render(<TopBar brand="A Very Long Wordmark That Should Not Wrap" meta="Some very long, unlabelled-looking meta text that could overflow" />);
    const brand = screen.getByText("A Very Long Wordmark That Should Not Wrap");
    expect(brand.getAttribute("style")).toContain("white-space: nowrap");
    const meta = screen.getByText(/Some very long/);
    expect(meta.getAttribute("style")).toContain("text-overflow: ellipsis");
  });
});

describe("TopBar — meta must be labelled", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns in dev if meta is a bare number", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<TopBar meta={31} />);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/bare number/);
  });

  it("does not warn when meta is a labelled string", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<TopBar meta="Zagreb · 42 printed / 74 not" />);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("TopBar — accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<TopBar meta="Zagreb · 42 printed / 74 not" filterCount={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

// Task 11: "Mobile: TopBar keeps the primary action and collapses the
// rest behind the search glyph."
describe("TopBar — mobile collapse", () => {
  afterEach(() => {
    // @ts-expect-error -- test-only cleanup
    delete window.matchMedia;
  });

  function mockMobile(isMobile: boolean) {
    window.matchMedia = ((query: string) => ({
      matches: isMobile,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
  }

  it("hides New Frame and The Index on mobile, keeps the primary visible", () => {
    mockMobile(true);
    render(<TopBar />);
    expect(screen.queryByText("New Frame")).toBeNull();
    expect(screen.queryByText("The Index")).toBeNull();
    expect(screen.getByText("To Print →")).toBeInTheDocument();
  });

  it("shows all actions on desktop (unchanged from Task 6)", () => {
    mockMobile(false);
    render(<TopBar />);
    expect(screen.getByText("New Frame")).toBeInTheDocument();
    expect(screen.getByText("The Index")).toBeInTheDocument();
  });

  it("reveals the collapsed actions when the search glyph is tapped on mobile", async () => {
    mockMobile(true);
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByLabelText("Show more actions"));
    expect(screen.getByText("New Frame")).toBeInTheDocument();
    expect(screen.getByText("The Index")).toBeInTheDocument();
  });

  it("hides them again on a second tap", async () => {
    mockMobile(true);
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByLabelText("Show more actions"));
    await user.click(screen.getByLabelText("Hide more actions"));
    expect(screen.queryByText("New Frame")).toBeNull();
  });

  it("still calls onSearch on mobile, in addition to expanding", async () => {
    mockMobile(true);
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<TopBar onSearch={onSearch} />);
    await user.click(screen.getByLabelText("Show more actions"));
    expect(onSearch).toHaveBeenCalled();
  });
});
