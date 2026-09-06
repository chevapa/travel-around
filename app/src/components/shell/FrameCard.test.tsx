// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { FrameCard } from "./FrameCard";

describe("FrameCard — fixed order: name -> print -> description -> drive time -> tags", () => {
  it("renders the name before the print/description/drive-time/tags in document order (MED 06 fix)", () => {
    const { container } = render(
      <FrameCard
        name="Sveti Križ Začretje"
        state="loved"
        src="photo.jpg"
        description="A restored manor house."
        driveTime="52 min"
        distance="49 km"
        tags={["Croatia", "Castle"]}
      />,
    );
    const text = container.textContent ?? "";
    const nameIdx = text.indexOf("Sveti Križ Začretje");
    const descIdx = text.indexOf("A restored manor house");
    const driveIdx = text.indexOf("52 min");
    const tagIdx = text.indexOf("Croatia");
    expect(nameIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeLessThan(descIdx);
    expect(descIdx).toBeLessThan(driveIdx);
    expect(driveIdx).toBeLessThan(tagIdx);
  });

  it("never puts a tag above the name — the live site's original mistake", () => {
    const { container } = render(<FrameCard name="Krapina" tags={["Croatia"]} />);
    const h3 = container.querySelector("h3");
    expect(h3?.textContent).toBe("Krapina");
    // the h3 is the first meaningful content node in the card body
    const body = h3?.parentElement?.parentElement;
    expect(body?.firstElementChild).toBe(h3?.parentElement);
  });
});

describe("FrameCard — Same roll is not variant=primary (Task 8 fix: TopBar already owns the one screen-wide primary)", () => {
  it("renders Same roll with the accent (pink) fill, not the primary (yellow) one", () => {
    render(<FrameCard name="Krapina" state="loved" src="p.jpg" onNearby={() => {}} />);
    const button = screen.getByText("Same roll →");
    expect(button.getAttribute("style")).toContain("var(--action-accent)");
    expect(button.getAttribute("style")).not.toContain("var(--action-primary)");
  });
});

describe("FrameCard — unprinted state", () => {
  it("shows the blank-frame placeholder, not a photo", () => {
    const { container } = render(<FrameCard name="Ozalj" state="unprinted" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/frame not/)).toBeInTheDocument();
  });
});

describe("FrameCard — actions", () => {
  it("calls onClose, onNearby, onToPrint, onRoute", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNearby = vi.fn();
    const onToPrint = vi.fn();
    const onRoute = vi.fn();
    render(<FrameCard name="Krapina" state="loved" src="p.jpg" onClose={onClose} onNearby={onNearby} onToPrint={onToPrint} onRoute={onRoute} />);
    await user.click(screen.getByLabelText("Close frame"));
    expect(onClose).toHaveBeenCalled();
    await user.click(screen.getByText("Same roll →"));
    expect(onNearby).toHaveBeenCalled();
    await user.click(screen.getByText(/To Print/));
    expect(onToPrint).toHaveBeenCalled();
    await user.click(screen.getByText(/Route/));
    expect(onRoute).toHaveBeenCalled();
  });
});

describe("FrameCard — accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <FrameCard name="Krapina" state="loved" src="p.jpg" description="Nice." driveTime="52 min" tags={["Croatia"]} onClose={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
