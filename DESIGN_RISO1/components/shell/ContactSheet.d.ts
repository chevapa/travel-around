import * as React from 'react';

export interface ContactFrame {
  name?: string;
  src?: string;
  state?: 'loved' | 'fine' | 'unprinted';
}

/**
 * The album view — the same dataset as the Atlas, laid out as a darkroom contact sheet on the
 * ink surface. The Atlas answers "where"; the Contact Sheet answers "what have we actually
 * done this year", and the blank cells are the wishlist.
 * @startingPoint section="Shell" subtitle="Album view — blanks are the wishlist" viewport="700x300"
 */
export interface ContactSheetProps extends React.HTMLAttributes<HTMLDivElement> {
  frames?: ContactFrame[];
  columns?: number;
  title?: string;
  /** Date range or sort description, e.g. "2023—2026". */
  range?: string;
  onPick?: (frame: ContactFrame, index: number) => void;
}
export function ContactSheet(props: ContactSheetProps): JSX.Element;
