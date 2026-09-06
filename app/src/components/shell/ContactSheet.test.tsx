// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactSheet, sortContactFrames, type ContactFrame } from "./ContactSheet";

describe("sortContactFrames", () => {
  const frames: ContactFrame[] = [
    { name: "A", date: "2024-01-01", driveMinutes: 90 },
    { name: "B", date: "2025-06-15", driveMinutes: 30 },
    { name: "C", date: undefined, driveMinutes: 60 },
  ];

  it("sorts by date, most recent first, undated last", () => {
    const sorted = sortContactFrames(frames, "date");
    expect(sorted.map((f) => f.name)).toEqual(["B", "A", "C"]);
  });

  it("sorts by drive time, closest first, unknown last", () => {
    const sorted = sortContactFrames(frames, "driveTime");
    expect(sorted.map((f) => f.name)).toEqual(["B", "C", "A"]);
  });

  it("is a stable no-op-order for two frames both missing the sort field", () => {
    const undated: ContactFrame[] = [{ name: "X" }, { name: "Y" }];
    expect(sortContactFrames(undated, "date").map((f) => f.name)).toEqual(["X", "Y"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...frames];
    sortContactFrames(frames, "date");
    expect(frames).toEqual(copy);
  });
});

describe("ContactSheet — unprinted frames stay as dashed blanks", () => {
  it("renders a dashed blank for unprinted frames, an image for the rest", () => {
    const { container } = render(
      <ContactSheet frames={[{ name: "A", src: "a.jpg", state: "loved" }, { name: "B", state: "unprinted" }]} />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("marks every cell — printed or not — for print (Task 11: no clipped rows)", () => {
    const { container } = render(
      <ContactSheet frames={[{ name: "A", src: "a.jpg", state: "loved" }, { name: "B", state: "unprinted" }]} />,
    );
    expect(container.querySelectorAll(".riso-contact-cell")).toHaveLength(2);
  });
});

// Issue 134: "after click just open weird non scrollable screen with
// question marks" — the sheet needs an always-visible way back out,
// independent of whatever else happens to be positioned nearby.
describe("ContactSheet — close control (issue 134)", () => {
  it("shows no close control when onClose is absent", () => {
    render(<ContactSheet frames={[]} />);
    expect(screen.queryByLabelText("Close contact sheet")).toBeNull();
  });

  it("calls onClose when clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ContactSheet frames={[]} onClose={onClose} />);
    await user.click(screen.getByLabelText("Close contact sheet"));
    expect(onClose).toHaveBeenCalled();
  });

  it("bounds its own height rather than growing past the viewport unreachably", () => {
    const { container } = render(<ContactSheet frames={[]} onClose={() => {}} />);
    expect((container.firstElementChild as HTMLElement).getAttribute("style")).toContain("max-height");
  });
});

describe("ContactSheet — sort control", () => {
  it("shows no sort control when onSortChange is absent", () => {
    render(<ContactSheet frames={[]} />);
    expect(screen.queryByRole("group", { name: "Sort contact sheet" })).toBeNull();
  });

  it("calls onSortChange with the clicked option", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<ContactSheet frames={[]} sortBy="date" onSortChange={onSortChange} />);
    await user.click(screen.getByText("By drive time"));
    expect(onSortChange).toHaveBeenCalledWith("driveTime");
  });

  it("marks the active sort option with aria-pressed", () => {
    render(<ContactSheet frames={[]} sortBy="driveTime" onSortChange={() => {}} />);
    expect(screen.getByText("By drive time")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("By date")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders frames pre-sorted by the current sortBy", () => {
    const frames: ContactFrame[] = [
      { name: "Far", src: "far.jpg", state: "loved", driveMinutes: 120 },
      { name: "Near", src: "near.jpg", state: "loved", driveMinutes: 20 },
    ];
    const { container } = render(<ContactSheet frames={frames} sortBy="driveTime" />);
    const imgs = Array.from(container.querySelectorAll("img"));
    expect(imgs.map((img) => img.getAttribute("alt"))).toEqual(["Near", "Far"]);
  });
});
