import type { CSSProperties, HTMLAttributes, KeyboardEvent } from "react";
import { STATE_LABEL, type FrameState, type StateCounts } from "../../model/frame";

/**
 * The permanent key in the Atlas's bottom-left corner — and a one-tap
 * filter. Colour is doing real work on the map, so something must decode
 * it without opening a panel (the HIGH 04 fix; see AUDIT.md). Always
 * mounted, always visible — that permanence is enforced by whoever
 * composes the Atlas screen (Task 8), not by this component in isolation.
 *
 * Ported from DESIGN_RISO1/components/atlas/Legend.jsx. Rows gained
 * role="button" + tabIndex + keyboard support (Space/Enter) and
 * aria-pressed — the reference's onClick-only span isn't reachable by
 * keyboard, which the rest of RISO1 treats as a bug (see StampCheck).
 */
export interface LegendProps extends HTMLAttributes<HTMLDivElement> {
  counts?: StateCounts;
  /** When set, that row reads as isolated and the others dim. */
  active?: FrameState | null;
  onToggle?: (key: FrameState) => void;
  title?: string;
}

const ROWS: { key: FrameState; label: string; swatch: CSSProperties }[] = [
  { key: "loved", label: STATE_LABEL.loved, swatch: { background: "var(--pink)", border: "1.5px solid var(--paper-2)" } },
  { key: "fine", label: STATE_LABEL.fine, swatch: { background: "var(--state-fine)", border: "1.5px solid var(--paper-2)" } },
  { key: "unprinted", label: STATE_LABEL.unprinted, swatch: { background: "transparent", border: "1.5px dashed var(--unprinted-edge)" } },
];

const DEFAULT_COUNTS: StateCounts = { loved: 31, fine: 11, unprinted: 74 };

export function Legend({ counts = DEFAULT_COUNTS, active, onToggle, title = "Reading the page", style, ...rest }: LegendProps) {
  return (
    <div
      {...rest}
      style={{
        background: "var(--ink)",
        color: "var(--text-on-invert)",
        padding: "9px 11px",
        display: "flex",
        flexDirection: "column",
        gap: 7,
        boxShadow: "5px 5px 0 rgba(25,21,16,.4)",
        borderRadius: "var(--radius)",
        ...style,
      }}
    >
      <span style={{ font: "var(--label-sm)", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--yellow)" }}>{title}</span>
      {ROWS.map((r) => {
        const dim = Boolean(active) && active !== r.key;
        const isActive = active === r.key;
        const toggle = () => onToggle?.(r.key);
        const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        };
        return (
          <span
            key={r.key}
            onClick={onToggle ? toggle : undefined}
            role={onToggle ? "button" : undefined}
            tabIndex={onToggle ? 0 : undefined}
            aria-pressed={onToggle ? isActive : undefined}
            onKeyDown={onToggle ? handleKeyDown : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              font: "var(--label-sm)",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: onToggle ? "pointer" : "default",
              opacity: dim ? 0.55 : 1,
            }}
          >
            <span aria-hidden="true" style={{ width: 20, height: 15, flex: "0 0 auto", ...r.swatch }} />
            {r.label} · {counts[r.key]}
          </span>
        );
      })}
    </div>
  );
}
