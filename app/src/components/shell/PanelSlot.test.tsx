// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EMPTY_PANEL_SLOT } from "./panelSlotReducer";
import { PanelSlot } from "./PanelSlot";

describe("PanelSlot", () => {
  it("renders nothing when empty", () => {
    const { container } = render(
      <PanelSlot state={EMPTY_PANEL_SLOT} renderIndex={() => <div>INDEX</div>} renderCard={() => <div>CARD</div>} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders only the index when state.kind is 'index'", () => {
    render(<PanelSlot state={{ kind: "index" }} renderIndex={() => <div>INDEX</div>} renderCard={() => <div>CARD</div>} />);
    expect(screen.getByText("INDEX")).toBeInTheDocument();
    expect(screen.queryByText("CARD")).toBeNull();
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
});
