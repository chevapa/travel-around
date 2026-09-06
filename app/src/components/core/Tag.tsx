import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";

/**
 * Small uppercase mono tag for a frame's categories (country, kind,
 * season). Tags live at the BOTTOM of a FrameCard — never above the place
 * name.
 *
 * Ported from DESIGN_RISO1/components/core/Tag.jsx. Issue 128: "the tags
 * on cards are not clickable and not showing the filtering... when clicked
 * it should filter by it" — `onClick` is optional (a Tag used purely as a
 * label, e.g. the drive-time chip, still renders as plain text), but when
 * passed, the tag becomes a real keyboard-operable control (role="button",
 * Space/Enter), same pattern as StampCheck/Legend elsewhere in this
 * codebase, plus a visible `active` state so the currently-applied filter
 * is obvious, not just "clickable and invisible."
 */
export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "onClick"> {
  tone?: "outline" | "ink" | "yellow";
  children?: ReactNode;
  onClick?: () => void;
  /** Renders the active/selected fill — the tag currently driving a filter. */
  active?: boolean;
}

const TONE: Record<NonNullable<TagProps["tone"]>, CSSProperties> = {
  outline: { background: "transparent", color: "var(--ink)", border: "var(--stroke-hair)" },
  ink: { background: "var(--ink)", color: "var(--text-on-invert)", border: "1.5px solid var(--ink)" },
  yellow: { background: "var(--yellow)", color: "var(--ink)", border: "var(--stroke)" },
};

const ACTIVE: CSSProperties = { background: "var(--yellow)", color: "var(--ink)", border: "var(--stroke)" };

export function Tag({ children, tone = "outline", active = false, onClick, style, ...rest }: TagProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <span
      {...rest}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? active : undefined}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={{
        display: "inline-block",
        padding: "4px 8px",
        font: "var(--label-sm)",
        fontSize: 9,
        letterSpacing: "var(--label-tracking)",
        textTransform: "uppercase",
        borderRadius: "var(--radius)",
        cursor: onClick ? "pointer" : undefined,
        ...TONE[tone],
        ...(active ? ACTIVE : null),
        ...style,
      }}
    >
      {children}
    </span>
  );
}
