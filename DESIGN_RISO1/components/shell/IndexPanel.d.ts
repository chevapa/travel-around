import * as React from 'react';

export interface IndexRow {
  key: string;
  label: string;
  count: number;
  checked?: boolean;
  /** Optional swatch style showing the state's map colour. */
  swatch?: React.CSSProperties;
}

/**
 * The filter panel, built as a physical card index: cardboard tab dividers instead of
 * accordions, stamped ✕ marks instead of checkboxes, a pinned ink footer that always states
 * the match count. Every label is full-ink at 16px — faded filter labels are the one thing
 * this component exists to prevent.
 * @startingPoint section="Shell" subtitle="Filters as a card index with tab dividers" viewport="700x340"
 */
export interface IndexPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs?: string[];
  activeTab?: string;
  onTab?: (tab: string) => void;
  rows?: IndexRow[];
  onToggleRow?: (key: string) => void;
  /** Number of frames matching the current filters — always shown, always labelled. */
  footerCount?: number;
  sortLabel?: string;
  onSort?: () => void;
}
export function IndexPanel(props: IndexPanelProps): JSX.Element;
