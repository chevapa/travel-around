import * as React from 'react';

/**
 * A sheet of RISO1 paper: warm stock, 2.5px ink border, hard offset shadow, zero radius.
 * Every panel, card and index in the system is a Paper. Never round its corners and never
 * blur its shadow. Optional tape strip for things that read as "stuck down".
 * @startingPoint section="Core" subtitle="Paper surface with ink border and offset shadow" viewport="700x220"
 */
export interface PaperProps extends React.HTMLAttributes<HTMLElement> {
  /** Paper stock. `ink` inverts to the dark surface used for legends and footers. */
  tone?: 'card' | 'page' | 'ground' | 'ink';
  /** Offset-shadow depth. `lg` is reserved for the Atlas itself. */
  lift?: 'none' | 'sm' | 'md' | 'lg';
  /** Adds a yellow tape strip over the top edge. */
  tape?: boolean;
  /** CSS padding shorthand. */
  pad?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}
export function Paper(props: PaperProps): JSX.Element;

export interface TapeStripProps {
  width?: number;
  left?: string;
  /** Keep within the ±4° tilt budget. */
  tilt?: number;
}
export function TapeStrip(props: TapeStripProps): JSX.Element;
