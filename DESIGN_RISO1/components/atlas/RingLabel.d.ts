import * as React from 'react';

/**
 * Drive-time isochrone furniture. The dashed rings say "an hour from home"; the yellow
 * stamped pennant labels them. Drive time is how day trips are actually chosen, so these
 * are first-class map elements, not a decoration.
 * @startingPoint section="Atlas" subtitle="Stamped drive-time pennants and dashed rings" viewport="700x150"
 */
export interface RingLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Short label — "1 H", "2 H", "30 MIN". */
  children?: React.ReactNode;
  tilt?: number;
}
export function RingLabel(props: RingLabelProps): JSX.Element;

export interface RingSetProps {
  /** Each ring's `inset` is "top side bottom" as percentages, plus its label. */
  rings?: { inset: string; label?: string }[];
}
/** The dashed concentric rings themselves; place inside a positioned Atlas container. */
export function RingSet(props: RingSetProps): JSX.Element;
