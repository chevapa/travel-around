import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

/**
 * Small uppercase mono tag for a frame's categories (country, kind,
 * season). Tags live at the BOTTOM of a FrameCard — never above the place
 * name.
 *
 * Ported from DESIGN_RISO1/components/core/Tag.jsx.
 */
export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "outline" | "ink" | "yellow";
  children?: ReactNode;
}

const TONE: Record<NonNullable<TagProps["tone"]>, CSSProperties> = {
  outline: { background: "transparent", color: "var(--ink)", border: "var(--stroke-hair)" },
  ink: { background: "var(--ink)", color: "var(--text-on-invert)", border: "1.5px solid var(--ink)" },
  yellow: { background: "var(--yellow)", color: "var(--ink)", border: "var(--stroke)" },
};

export function Tag({ children, tone = "outline", style, ...rest }: TagProps) {
  return (
    <span
      {...rest}
      style={{
        display: "inline-block",
        padding: "4px 8px",
        font: "var(--label-sm)",
        fontSize: 9,
        letterSpacing: "var(--label-tracking)",
        textTransform: "uppercase",
        borderRadius: "var(--radius)",
        ...TONE[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
