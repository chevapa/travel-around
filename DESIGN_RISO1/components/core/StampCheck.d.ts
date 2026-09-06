import * as React from 'react';

/**
 * A checkbox stamped with a hand-drawn pink ✕ instead of a tick.
 * Unchecked state is shown by the EMPTY box only — never by fading the label beside it.
 * @startingPoint section="Core" subtitle="Hand-stamped ✕ checkbox for The Index" viewport="700x150"
 */
export interface StampCheckProps extends React.HTMLAttributes<HTMLSpanElement> {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  size?: number;
}
export function StampCheck(props: StampCheckProps): JSX.Element;
