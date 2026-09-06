import type { CSSProperties, ReactNode } from "react";
import { MOBILE_BREAKPOINT_QUERY, useMediaQuery, usePrefersReducedMotion } from "../../lib/motion";
import type { PanelSlotState } from "./panelSlotReducer";

/**
 * The physical slot itself — one positioned region, docked right on
 * desktop, a bottom sheet on mobile (Task 11: "panel slot becomes a
 * bottom sheet"). Renders at most one occupant because PanelSlotState
 * (see panelSlotReducer.ts) can only ever describe one.
 *
 * Always mounted — even when empty — so opening/closing can be a real
 * 160ms slide (Task 11's own number, --dur-panel) rather than an instant
 * mount/unmount. Slides off to the right on desktop, down off the bottom
 * edge on mobile; `prefers-reduced-motion` disables the transition
 * entirely rather than just shortening it.
 */
/** How tall the mobile bottom sheet is allowed to grow — shared with AtlasScreen so Legend can position itself just above it. */
export const MOBILE_SHEET_MAX_HEIGHT_VH = 70;

export interface PanelSlotProps {
  state: PanelSlotState;
  renderIndex: () => ReactNode;
  renderCard: (frameId: string) => ReactNode;
}

export function PanelSlot({ state, renderIndex, renderCard }: PanelSlotProps) {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const reducedMotion = usePrefersReducedMotion();
  const occupied = state.kind !== "empty";

  const layoutStyle: CSSProperties = isMobile
    ? {
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: `${MOBILE_SHEET_MAX_HEIGHT_VH}vh`,
        transform: occupied ? "translateY(0)" : "translateY(100%)",
      }
    : {
        right: 14,
        top: 74,
        bottom: 14,
        width: "min(38%, 360px)",
        transform: occupied ? "translateX(0)" : "translateX(110%)",
      };

  return (
    <div
      aria-hidden={!occupied}
      style={{
        position: "absolute",
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
        // unclickable. Also genuinely "none" while off-screen and empty,
        // so the space it still occupies mid-slide can't steal a click.
        pointerEvents: occupied ? "auto" : "none",
        transition: reducedMotion ? "none" : "transform var(--dur-panel) var(--ease)",
        ...layoutStyle,
      }}
    >
      {state.kind === "index" ? renderIndex() : state.kind === "card" ? renderCard(state.frameId) : null}
    </div>
  );
}
