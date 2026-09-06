import * as React from 'react';

/**
 * The permanent key in the Atlas's bottom-left corner — and a one-tap filter.
 * Colour is doing real work on the map, so something must decode it without opening a panel.
 * Sits on the inverted ink surface so it stays legible over any terrain.
 * @startingPoint section="Atlas" subtitle="Permanent map key that doubles as a filter" viewport="700x200"
 */
export interface LegendProps extends React.HTMLAttributes<HTMLDivElement> {
  counts?: { loved: number; fine: number; unprinted: number };
  /** When set, that row reads as isolated and the others dim. */
  active?: 'loved' | 'fine' | 'unprinted' | null;
  onToggle?: (key: 'loved' | 'fine' | 'unprinted') => void;
  title?: string;
}
export function Legend(props: LegendProps): JSX.Element;
