import type { ReactNode } from "react";
import type { PanelSlotState } from "./panelSlotReducer";

/**
 * The physical slot itself — one positioned region, docked right on
 * desktop. Renders at most one occupant because PanelSlotState (see
 * panelSlotReducer.ts) can only ever describe one.
 *
 * Becomes a bottom sheet on mobile per Task 11
 * (DESIGN_RISO1/IMPLEMENTATION_PLAN.md, "Mobile: panel slot becomes a
 * bottom sheet") — not implemented here; that task owns the responsive
 * pass and depends on this one.
 */
export interface PanelSlotProps {
  state: PanelSlotState;
  renderIndex: () => ReactNode;
  renderCard: (frameId: string) => ReactNode;
}

export function PanelSlot({ state, renderIndex, renderCard }: PanelSlotProps) {
  if (state.kind === "empty") return null;
  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        top: 74,
        bottom: 14,
        width: "min(38%, 360px)",
        display: "flex",
      }}
    >
      {state.kind === "index" ? renderIndex() : renderCard(state.frameId)}
    </div>
  );
}
