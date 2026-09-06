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
        // Chrome, always above map content — any element with a *set*
        // z-index (a Print pin, a cluster) otherwise creates its own
        // stacking level regardless of DOM order and can paint over an
        // unindexed panel. See AtlasScreen.tsx's Z_CHROME for the fuller
        // explanation of why this isn't just theoretical.
        zIndex: 10,
        // Real map integration (AtlasScreen) nests this inside a
        // pointer-events:none overlay layer (so map-drag gestures pass
        // through empty areas) — pointer-events is inherited in CSS, so
        // without this override the panel would inherit "none" and become
        // unclickable.
        pointerEvents: "auto",
      }}
    >
      {state.kind === "index" ? renderIndex() : renderCard(state.frameId)}
    </div>
  );
}
