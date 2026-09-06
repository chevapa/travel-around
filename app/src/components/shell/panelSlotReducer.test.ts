import { describe, expect, it } from "vitest";
import { EMPTY_PANEL_SLOT, panelSlotReducer } from "./panelSlotReducer";

// Task 7 acceptance check: "it is impossible to have the card and the
// index open simultaneously (assert in a test)". Since PanelSlotState is
// one discriminated union rather than two booleans, there's no state that
// could even represent "both open" — every action below produces exactly
// one of empty/index/card, never a combination.
describe("panelSlotReducer", () => {
  it("starts empty", () => {
    expect(EMPTY_PANEL_SLOT).toEqual({ kind: "empty" });
  });

  it("openIndex opens the index", () => {
    expect(panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openIndex" })).toEqual({ kind: "index" });
  });

  it("openCard opens a card for the given frame", () => {
    expect(panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openCard", frameId: "b7nmno2d" })).toEqual({
      kind: "card",
      frameId: "b7nmno2d",
    });
  });

  it("opening the index while a card is open REPLACES it, never adds to it", () => {
    const withCard = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openCard", frameId: "x" });
    const next = panelSlotReducer(withCard, { type: "openIndex" });
    expect(next).toEqual({ kind: "index" });
    expect(next).not.toHaveProperty("frameId");
  });

  it("opening a card while the index is open REPLACES it, never adds to it", () => {
    const withIndex = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openIndex" });
    const next = panelSlotReducer(withIndex, { type: "openCard", frameId: "y" });
    expect(next).toEqual({ kind: "card", frameId: "y" });
  });

  it("opening a card while a DIFFERENT card is open replaces it with the new one", () => {
    const withCardX = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openCard", frameId: "x" });
    const next = panelSlotReducer(withCardX, { type: "openCard", frameId: "y" });
    expect(next).toEqual({ kind: "card", frameId: "y" });
  });

  it("close always empties the slot regardless of prior state", () => {
    const withCard = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openCard", frameId: "x" });
    expect(panelSlotReducer(withCard, { type: "close" })).toEqual(EMPTY_PANEL_SLOT);
    const withIndex = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openIndex" });
    expect(panelSlotReducer(withIndex, { type: "close" })).toEqual(EMPTY_PANEL_SLOT);
  });

  // Task 10: New Frame is the same slot, same one-occupant invariant.
  it("openNewFrame opens the New Frame form at the given coordinates", () => {
    expect(panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openNewFrame", lat: 45.8, lon: 15.9 })).toEqual({
      kind: "newFrame",
      lat: 45.8,
      lon: 15.9,
    });
  });

  it("opening New Frame while a card is open replaces it, never adds to it", () => {
    const withCard = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openCard", frameId: "x" });
    const next = panelSlotReducer(withCard, { type: "openNewFrame", lat: 1, lon: 2 });
    expect(next).toEqual({ kind: "newFrame", lat: 1, lon: 2 });
  });

  it("opening a card while New Frame is open replaces it", () => {
    const withNewFrame = panelSlotReducer(EMPTY_PANEL_SLOT, { type: "openNewFrame", lat: 1, lon: 2 });
    const next = panelSlotReducer(withNewFrame, { type: "openCard", frameId: "x" });
    expect(next).toEqual({ kind: "card", frameId: "x" });
  });
});
