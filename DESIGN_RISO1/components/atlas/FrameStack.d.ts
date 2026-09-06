import * as React from 'react';

/**
 * A map cluster: a physical stack of prints with the count written on top in marker.
 * Deliberately QUIETER than a single Print — a cluster carries less information than a place,
 * so it must never be the loudest thing on the Atlas.
 * @startingPoint section="Atlas" subtitle="Cluster as a stack of prints, count in marker" viewport="700x180"
 */
export interface FrameStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** How many frames are collapsed into this stack. */
  count?: number;
  width?: number;
  height?: number;
  tilt?: number;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}
export function FrameStack(props: FrameStackProps): JSX.Element;
