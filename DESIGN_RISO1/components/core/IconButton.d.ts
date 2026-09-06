import * as React from 'react';

/**
 * Square icon button for chrome actions that need no words (search, close, zoom).
 * RISO1 has no icon library: glyphs are single Unicode characters set in the mono face.
 * @startingPoint section="Core" subtitle="Unicode glyph buttons — search, close, route" viewport="700x150"
 */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** A single Unicode glyph — ⌕ ✕ ★ ↗ → ◠. Never an emoji. */
  glyph?: string;
  /** Required for accessibility; also the tooltip. */
  label: string;
  /** Visual box size in px; the tap target stays 44px regardless. */
  size?: number;
}
export function IconButton(props: IconButtonProps): JSX.Element;
