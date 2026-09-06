import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "../core/Button";
import { IconButton } from "../core/IconButton";

/**
 * The single bar of chrome. One bar, one hierarchy: glyph → paper → ink →
 * yellow, left to right, ascending in weight, so the primary action is
 * never out-shouted. Search is an icon, not a wide field. The bar never
 * tilts — nor does anything inside it.
 *
 * Ported from DESIGN_RISO1/components/shell/TopBar.jsx, with one
 * deliberate deviation: the reference (and readme.md's "No logo" section)
 * rotates the wordmark chip -1.5°, but readme.md's own "Tilt" rule and this
 * task's acceptance check both say the top bar and its contents never
 * rotate ("Assert transform: none on the bar and its children in a test" —
 * Task 6, DESIGN_RISO1/IMPLEMENTATION_PLAN.md). Those two statements in the
 * source docs contradict each other; this build follows the explicit,
 * testable rule and ships the wordmark flat. Also: the reference's raw
 * white hex literal on the wordmark text became var(--paper-print) to
 * satisfy the hex-colour gate.
 */
export interface TopBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Wordmark text, set in the pink display chip. */
  brand?: string;
  /** Honest, labelled counts — e.g. "Zagreb · 42 printed / 74 not". Never a bare number. */
  meta?: ReactNode;
  /** Active filter count; renders as the pink badge on The Index. */
  filterCount?: number;
  onSearch?: () => void;
  onNewFrame?: () => void;
  onIndex?: () => void;
  onPrint?: () => void;
  primaryLabel?: string;
}

export function TopBar({
  brand = "The Atlas",
  meta,
  filterCount,
  onSearch,
  onNewFrame,
  onIndex,
  onPrint,
  primaryLabel = "To Print →",
  style,
  ...rest
}: TopBarProps) {
  if (import.meta.env.DEV && typeof meta === "number") {
    console.warn(
      `[TopBar] meta was passed a bare number (${meta}) — every count must be labelled (see src/model/frame.ts's formatMeta). Wrap it in a string like "Zagreb · 42 printed / 74 not".`,
    );
  }

  return (
    <div
      {...rest}
      style={{
        background: "var(--paper-2)",
        borderBottom: "var(--stroke-heavy)",
        padding: "var(--pad-bar)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <span
          style={{
            font: "var(--display-2)",
            fontSize: 21,
            letterSpacing: "var(--display-tracking)",
            textTransform: "uppercase",
            background: "var(--pink)",
            color: "var(--paper-print)",
            padding: "2px 9px",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {brand}
        </span>
        {meta ? (
          <span
            style={{
              font: "var(--label-sm)",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink)",
              border: "var(--stroke)",
              padding: "3px 7px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {meta}
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 8 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <IconButton glyph="⌕" label="Search frames" onClick={onSearch} />
        <Button variant="secondary" size="sm" onClick={onNewFrame}>
          New Frame
        </Button>
        <Button variant="invert" size="sm" badge={filterCount || undefined} onClick={onIndex}>
          The Index
        </Button>
        <Button variant="primary" size="md" onClick={onPrint}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
