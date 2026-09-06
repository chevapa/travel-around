import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { usePrefersReducedMotion } from "../../lib/motion";

/**
 * The system's button. Mono uppercase label, square corners, ink border.
 * Hierarchy is carried by fill, not by size: yellow = the ONE primary
 * action on screen, paper = secondary, ink = tertiary/toggle. Pressing
 * moves the button into its own shadow.
 *
 * Ported from DESIGN_RISO1/components/core/Button.jsx — see Button.prompt.md.
 * "Exactly one primary per screen" is a design rule the component can't
 * enforce by itself, so it self-reports a dev-mode warning instead
 * (Task 3, DESIGN_RISO1/IMPLEMENTATION_PLAN.md).
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` (yellow + offset shadow) is limited to one per screen. */
  variant?: "primary" | "secondary" | "invert" | "accent";
  size?: "sm" | "md" | "lg";
  /** Pink counter pinned to the top-right corner — used for active filter count. */
  badge?: number | string;
  disabled?: boolean;
  children?: ReactNode;
}

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, CSSProperties> = {
  primary: { background: "var(--action-primary)", color: "var(--ink)", border: "var(--stroke-heavy)", boxShadow: "var(--lift-2)" },
  secondary: { background: "var(--paper-2)", color: "var(--ink)", border: "var(--stroke)", boxShadow: "none" },
  invert: { background: "var(--ink)", color: "var(--text-on-invert)", border: "var(--stroke)", boxShadow: "none" },
  accent: { background: "var(--action-accent)", color: "var(--paper-print)", border: "var(--stroke-heavy)", boxShadow: "var(--lift-2)" },
};

const SIZE: Record<NonNullable<ButtonProps["size"]>, { padding: string; fontSize: number }> = {
  sm: { padding: "8px 11px", fontSize: 10 },
  md: { padding: "9px 15px", fontSize: 11 },
  lg: { padding: "13px 20px", fontSize: 13 },
};

// Dev-mode-only tally of currently-mounted `variant="primary"` buttons, so a
// second one mounting anywhere in the tree is caught instead of silently
// breaking the "one yellow action per screen" rule.
let mountedPrimaryCount = 0;

export function Button({ variant = "secondary", size = "md", badge, disabled = false, style, children, ...rest }: ButtonProps) {
  const [down, setDown] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const v = VARIANT[variant] ?? VARIANT.secondary;
  const lifted = v.boxShadow !== "none";

  useEffect(() => {
    if (!import.meta.env.DEV || variant !== "primary") return;
    mountedPrimaryCount += 1;
    if (mountedPrimaryCount > 1) {
      console.warn(
        `[Button] ${mountedPrimaryCount} variant="primary" buttons are mounted at once — RISO1 allows exactly one primary action per screen.`,
      );
    }
    return () => {
      mountedPrimaryCount -= 1;
    };
  }, [variant]);

  const pressedStyle: CSSProperties | null =
    down && !disabled
      ? lifted
        ? { transform: "translate(2px,2px)", boxShadow: "none" }
        : { background: "var(--ink)", color: "var(--text-on-invert)" }
      : null;

  return (
    <button
      {...rest}
      disabled={disabled}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        position: "relative",
        font: "var(--label)",
        fontSize: SIZE[size].fontSize,
        letterSpacing: "var(--label-tracking)",
        textTransform: "uppercase",
        padding: SIZE[size].padding,
        minHeight: "var(--tap-min)",
        borderRadius: "var(--radius)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        transition: reducedMotion ? "none" : "transform var(--dur-press) var(--ease), box-shadow var(--dur-press) var(--ease)",
        ...v,
        ...pressedStyle,
        ...style,
      }}
    >
      {children}
      {badge != null ? (
        <span
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "var(--pink)",
            // Issue 105 (found in Task 7-8): white text on --pink measures
            // 3.51:1 at this 9px size — below the 4.5:1 AA bar Task 7 set
            // for every filter label, and this badge (TopBar's "The Index"
            // counter) is on every screen. --ink on --pink is 5.18:1.
            color: "var(--ink)",
            border: "var(--stroke)",
            font: "var(--label-sm)",
            fontSize: 9,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
