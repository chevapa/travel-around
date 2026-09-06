import type { HTMLAttributes, KeyboardEvent } from "react";

type SpanAttributesWithoutOnChange = Omit<HTMLAttributes<HTMLSpanElement>, "onChange">;

/**
 * A checkbox stamped with a hand-drawn pink ✕ instead of a tick. Unchecked
 * state is shown by the EMPTY box only — never by fading the label beside
 * it (this is the CRIT 02 fix from the design review; see AUDIT.md).
 *
 * Ported from DESIGN_RISO1/components/core/StampCheck.jsx — already
 * keyboard-operable (space/enter) with role="checkbox" + aria-checked in
 * the reference, carried through unchanged.
 *
 * Accessibility note: this is a bare `<span role="checkbox">`, not a native
 * `<input>` — wrapping it in a `<label>` does NOT give it an accessible
 * name the way a native checkbox gets one. Every usage must pass its own
 * `aria-label` (or `aria-labelledby`), or axe flags it
 * (aria-toggle-field-name).
 */
export interface StampCheckProps extends SpanAttributesWithoutOnChange {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  size?: number;
}

export function StampCheck({ checked = false, onChange, size = 22, style, ...rest }: StampCheckProps) {
  const toggle = () => onChange?.(!checked);
  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <span
      {...rest}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={handleKeyDown}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        border: "var(--stroke-heavy)",
        borderRadius: "var(--radius)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: "var(--hand)",
        fontSize: size,
        lineHeight: 1,
        color: "var(--pink)",
        background: "transparent",
        cursor: "pointer",
        userSelect: "none",
        ...style,
      }}
    >
      {checked ? "✕" : ""}
    </span>
  );
}
