import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * A sheet of RISO1 paper: warm stock, 2.5px ink border, hard offset shadow,
 * zero radius. Every panel, card and index in the system is a Paper. Never
 * round its corners and never blur its shadow.
 *
 * Ported from DESIGN_RISO1/components/core/Paper.jsx — see Paper.prompt.md.
 */
export interface PaperProps extends HTMLAttributes<HTMLElement> {
  /** Paper stock. `ink` inverts to the dark surface used for legends and footers. */
  tone?: "card" | "page" | "ground" | "ink";
  /** Offset-shadow depth. `lg` is reserved for the Atlas itself. */
  lift?: "none" | "sm" | "md" | "lg";
  /** Adds a yellow tape strip over the top edge. */
  tape?: boolean;
  /** CSS padding shorthand. */
  pad?: string;
  as?: ElementType;
  children?: ReactNode;
}

const TONE: Record<NonNullable<PaperProps["tone"]>, string> = {
  card: "var(--paper-2)",
  page: "var(--paper-1)",
  ground: "var(--paper-3)",
  ink: "var(--ink)",
};

const LIFT: Record<NonNullable<PaperProps["lift"]>, string> = {
  none: "none",
  sm: "var(--lift-2)",
  md: "var(--lift-3)",
  lg: "var(--lift-4)",
};

export function Paper({
  tone = "card",
  lift = "md",
  tape = false,
  pad = "var(--pad-card)",
  as = "div",
  style,
  children,
  ...rest
}: PaperProps) {
  const Tag = as;
  const combinedStyle: CSSProperties = {
    position: "relative",
    background: TONE[tone] ?? TONE.card,
    color: tone === "ink" ? "var(--text-on-invert)" : "var(--text-body)",
    border: "var(--stroke-heavy)",
    borderRadius: "var(--radius)",
    boxShadow: LIFT[lift],
    padding: pad,
    font: "var(--body)",
    ...style,
  };
  return (
    <Tag {...rest} style={combinedStyle}>
      {tape ? <TapeStrip /> : null}
      {children}
    </Tag>
  );
}

export interface TapeStripProps {
  width?: number;
  left?: string;
  /** Keep within the ±4° tilt budget. */
  tilt?: number;
}

export function TapeStrip({ width = 76, left = "26%", tilt = -2 }: TapeStripProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -9,
        left,
        width,
        height: 22,
        background: "var(--tape)",
        borderLeft: "1px dashed rgba(25,21,16,.4)",
        borderRight: "1px dashed rgba(25,21,16,.4)",
        transform: `rotate(${tilt}deg)`,
        zIndex: 2,
      }}
    />
  );
}
