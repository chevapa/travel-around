// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EMPTY_PANEL_SLOT } from "./panelSlotReducer";
import { PanelSlot } from "./PanelSlot";

// Task 11: the slot is always mounted (so opening/closing can be a real
// 160ms slide, not an instant mount/unmount) — "renders nothing" now means
// "renders no *content*, translated off-screen and non-interactive", not
// "absent from the DOM".
describe("PanelSlot", () => {
  it("renders no content when empty, and is non-interactive", () => {
    const { container } = render(
      <PanelSlot state={EMPTY_PANEL_SLOT} renderIndex={() => <div>INDEX</div>} renderCard={() => <div>CARD</div>} />,
    );
    expect(screen.queryByText("INDEX")).toBeNull();
    expect(screen.queryByText("CARD")).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.getAttribute("style")).toContain("pointer-events: none");
  });

  it("slides in and becomes interactive when the index opens", () => {
    const { container } = render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => <div>CARD</div>} />);
    expect(screen.getByText("INDEX")).toBeInTheDocument();
    expect(screen.queryByText("CARD")).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("false");
    expect(root.getAttribute("style")).toContain("pointer-events: auto");
  });

  it("renders only the card, with its frameId, when state.kind is 'card'", () => {
    render(
      <PanelSlot
        state={{ kind: "card", frameId: "b7nmno2d" }}
        renderIndex={() => <div>INDEX</div>}
        renderCard={(id) => <div>CARD {id}</div>}
      />,
    );
    expect(screen.getByText("CARD b7nmno2d")).toBeInTheDocument();
    expect(screen.queryByText("INDEX")).toBeNull();
  });

  it("uses a 160ms transition (--dur-panel) by default", () => {
    const { container } = render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("style")).toContain("var(--dur-panel)");
  });

  it("disables the transition entirely when the OS prefers reduced motion", () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const { container } = render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => null} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("style")).toContain("transition: none");
    // @ts-expect-error -- test-only cleanup
    delete window.matchMedia;
  });
});

describe("PanelSlot — mobile becomes a bottom sheet (Task 11)", () => {
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

  it("docks right on desktop", () => {
    mockMobile(false);
    const { container } = render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => null} />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("right: 14px");
    expect(style).toContain("translateX(0)");
  });

  it("becomes a full-width bottom sheet on mobile", () => {
    mockMobile(true);
    const { container } = render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => null} />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("left: 0px");
    expect(style).toContain("right: 0px");
    expect(style).toContain("bottom: 0px");
    expect(style).toContain("translateY(0)");
  });

  it("slides down off-screen (not sideways) when empty on mobile", () => {
    mockMobile(true);
    const { container } = render(<PanelSlot state={EMPTY_PANEL_SLOT} renderIndex={() => <div>INDEX</div>} renderCard={() => null} />);
    const style = (container.firstElementChild as HTMLElement).getAttribute("style") ?? "";
    expect(style).toContain("translateY(100%)");
  });
});
