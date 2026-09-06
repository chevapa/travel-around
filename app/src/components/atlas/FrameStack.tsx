import type { HTMLAttributes, MouseEventHandler } from "react";

/**
 * A map cluster: a physical stack of prints with the count written on top
 * in marker. Deliberately QUIETER than a single Print — a cluster carries
 * less information than a place, so it must never be the loudest thing on
 * the Atlas (the HIGH 04 fix from the design review; see AUDIT.md). Paper
 * fill, ink outline, handwritten numeral — never coloured.
 *
 * Ported from DESIGN_RISO1/components/atlas/FrameStack.jsx.
 */
export interface FrameStackProps extends HTMLAttributes<HTMLDivElement> {
  /** How many frames are collapsed into this stack. */
  count?: number;
  width?: number;
  height?: number;
  tilt?: number;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

export function FrameStack({ count = 2, width = 58, height = 46, tilt = -6, onClick, style, ...rest }: FrameStackProps) {
  return (
    <div
      {...rest}
      onClick={onClick}
      style={{
        position: "relative",
        width,
        height,
        transform: `rotate(${tilt}deg)`,
        cursor: onClick ? "pointer" : "default",
        minWidth: "var(--tap-min)",
        minHeight: "var(--tap-min)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--paper-print)",
          transform: "rotate(8deg)",
          boxShadow: "2px 2px 0 rgba(25,21,16,.35)",
          clipPath: "polygon(2% 4%,50% 0%,100% 3%,97% 50%,100% 97%,48% 100%,3% 96%)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--paper-print)",
          transform: "rotate(-5deg)",
          boxShadow: "2px 2px 0 rgba(25,21,16,.35)",
          clipPath: "polygon(3% 2%,52% 5%,100% 1%,96% 52%,100% 98%,46% 95%,1% 99%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--paper-2)",
          border: "var(--stroke)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          font: "var(--hand)",
          fontSize: 26,
          color: "var(--pink)",
        }}
      >
        {count}
      </span>
    </div>
  );
}
