import type { ButtonHTMLAttributes } from "react";

/**
 * Square icon button for chrome actions that need no words (search, close,
 * zoom). RISO1 has no icon library: glyphs are single Unicode characters
 * set in the mono face.
 *
 * Ported from DESIGN_RISO1/components/core/IconButton.jsx.
 */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** A single Unicode glyph — ⌕ ✕ ★ ↗ → ◠. Never an emoji. */
  glyph?: string;
  /** Required for accessibility; also the tooltip. */
  label: string;
  /** Visual box size in px; the tap target stays 44px regardless. */
  size?: number;
}

export function IconButton({ glyph = "⌕", label, size = 32, style, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      style={{
        width: size,
        height: size,
        minWidth: "var(--tap-min)",
        minHeight: "var(--tap-min)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper-2)",
        color: "var(--ink)",
        border: "var(--stroke)",
        borderRadius: "var(--radius)",
        fontSize: Math.round(size * 0.47),
        lineHeight: 1,
        cursor: "pointer",
        ...style,
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
