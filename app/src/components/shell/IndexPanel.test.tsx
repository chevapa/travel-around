// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { IndexPanel, type IndexSection } from "./IndexPanel";

const SECTIONS: IndexSection[] = [
  {
    tab: "State",
    rows: [
      { key: "loved", label: "Printed · loved", count: 31, checked: true },
      { key: "unprinted", label: "Not printed", count: 74 },
    ],
  },
  {
    tab: "Season",
    rows: [
      { key: "summer", label: "Summer", count: 20, checked: true },
      { key: "winter", label: "Winter", count: 5 },
    ],
  },
];

describe("IndexPanel — footer always labels its number (MED 08 / formatMeta rule)", () => {
  it("never renders a bare footer count", () => {
    render(<IndexPanel sections={SECTIONS} footerCount={105} />);
    expect(screen.getByText("105 frames match")).toBeInTheDocument();
  });
});

describe("IndexPanel — unchecked state is the empty stamp only, never a faded label", () => {
  it("row labels have no reduced-opacity styling regardless of checked state", () => {
    render(<IndexPanel sections={SECTIONS} activeTab="State" />);
    const loved = screen.getByText("Printed · loved");
    const unprinted = screen.getByText("Not printed");
    expect(loved.getAttribute("style") ?? "").not.toMatch(/opacity/);
    expect(unprinted.getAttribute("style") ?? "").not.toMatch(/opacity/);
  });

  it("renders every row as a StampCheck (role=checkbox), not a native input", () => {
    render(<IndexPanel sections={SECTIONS} activeTab="State" />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });
});

describe("IndexPanel — collapsed sections show active values as removable chips", () => {
  it("shows a chip for the inactive Season section's checked row while State is active", () => {
    render(<IndexPanel sections={SECTIONS} activeTab="State" />);
    expect(screen.getByText(/Season: Summer/)).toBeInTheDocument();
  });

  it("shows no chip for a section with nothing checked", () => {
    const sections: IndexSection[] = [
      { tab: "State", rows: [{ key: "loved", label: "Loved", count: 1, checked: true }] },
      { tab: "Season", rows: [{ key: "summer", label: "Summer", count: 1, checked: false }] },
    ];
    render(<IndexPanel sections={sections} activeTab="State" />);
    expect(screen.queryByText(/Season:/)).toBeNull();
  });

  it("shows no chips for the currently active section, even if it has checked rows", () => {
    render(<IndexPanel sections={SECTIONS} activeTab="State" />);
    expect(screen.queryByText(/State: Printed/)).toBeNull();
  });

  it("removing a chip calls onToggleRow with that section's tab and key, without switching tabs", async () => {
    const user = userEvent.setup();
    const onToggleRow = vi.fn();
    render(<IndexPanel sections={SECTIONS} activeTab="State" onToggleRow={onToggleRow} />);
    await user.click(screen.getByText(/Season: Summer/));
    expect(onToggleRow).toHaveBeenCalledWith("Season", "summer");
  });
});

describe("IndexPanel — tabs", () => {
  it("switches the visible section when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onTab = vi.fn();
    render(<IndexPanel sections={SECTIONS} activeTab="State" onTab={onTab} />);
    await user.click(screen.getByText("Season"));
    expect(onTab).toHaveBeenCalledWith("Season");
  });

  it("is keyboard-operable", async () => {
    const user = userEvent.setup();
    const onTab = vi.fn();
    render(<IndexPanel sections={SECTIONS} activeTab="State" onTab={onTab} />);
    const seasonTab = screen.getByText("Season");
    seasonTab.focus();
    await user.keyboard("{Enter}");
    expect(onTab).toHaveBeenCalledWith("Season");
  });
});

describe("IndexPanel — accessibility", () => {
  it("has no axe violations, with chips and tabs both present", async () => {
    const { container } = render(
      <IndexPanel sections={SECTIONS} activeTab="State" onTab={() => {}} onToggleRow={() => {}} onSort={() => {}} footerCount={40} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
