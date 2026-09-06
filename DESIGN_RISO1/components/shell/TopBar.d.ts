import * as React from 'react';

/**
 * The single bar of chrome. One bar, one hierarchy: glyph → paper → ink → yellow, left to
 * right, ascending in weight, so the primary action is never out-shouted. Search is an icon,
 * not a wide field — this is a map you browse visually. The bar never tilts.
 * @startingPoint section="Shell" subtitle="One bar of chrome, ascending action weight" viewport="700x120"
 */
export interface TopBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Wordmark text, set in the pink display chip. */
  brand?: string;
  /** Honest, labelled counts — e.g. "Zagreb · 42 printed / 74 not". Never a bare number. */
  meta?: React.ReactNode;
  /** Active filter count; renders as the pink badge on The Index. */
  filterCount?: number;
  onSearch?: () => void;
  onNewFrame?: () => void;
  onIndex?: () => void;
  onPrint?: () => void;
  primaryLabel?: string;
}
export function TopBar(props: TopBarProps): JSX.Element;
