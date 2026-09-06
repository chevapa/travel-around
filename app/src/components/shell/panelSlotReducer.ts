import { useReducer } from "react";

/**
 * The single panel slot (Task 7, DESIGN_RISO1/IMPLEMENTATION_PLAN.md): one
 * positioned region holding at most one occupant. Opening The Index closes
 * any open card and vice versa — MED 07 was two overlapping sheets over
 * the map (see AUDIT.md).
 *
 * Modelled as one discriminated union, not two independent booleans — a
 * card and The Index being open "at the same time" is a state this type
 * cannot even represent, let alone render, so the invariant holds
 * structurally rather than by convention.
 *
 * `newFrame` added in Task 10 — the same slot, the same one-occupant
 * invariant, for the New Frame flow (a map long-press per the product
 * decision on epic #84, carrying the coordinates it was long-pressed at).
 */
export type PanelSlotState =
  | { kind: "empty" }
  | { kind: "index" }
  | { kind: "card"; frameId: string }
  | { kind: "newFrame"; lat: number; lon: number };

export type PanelSlotAction =
  | { type: "openIndex" }
  | { type: "openCard"; frameId: string }
  | { type: "openNewFrame"; lat: number; lon: number }
  | { type: "close" };

export const EMPTY_PANEL_SLOT: PanelSlotState = { kind: "empty" };

export function panelSlotReducer(_state: PanelSlotState, action: PanelSlotAction): PanelSlotState {
  switch (action.type) {
    case "openIndex":
      return { kind: "index" };
    case "openCard":
      return { kind: "card", frameId: action.frameId };
    case "openNewFrame":
      return { kind: "newFrame", lat: action.lat, lon: action.lon };
    case "close":
      return EMPTY_PANEL_SLOT;
  }
}

export function usePanelSlot(initial: PanelSlotState = EMPTY_PANEL_SLOT) {
  const [state, dispatch] = useReducer(panelSlotReducer, initial);
  return {
    state,
    openIndex: () => dispatch({ type: "openIndex" }),
    openCard: (frameId: string) => dispatch({ type: "openCard", frameId }),
    openNewFrame: (lat: number, lon: number) => dispatch({ type: "openNewFrame", lat, lon }),
    close: () => dispatch({ type: "close" }),
  };
}
