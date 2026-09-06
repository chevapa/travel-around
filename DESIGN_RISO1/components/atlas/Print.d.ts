import * as React from 'react';

/**
 * THE signature component. One place on the Atlas, rendered as a photographic print.
 * The three states are the product's whole semantic: a colour print (been, loved),
 * a black-and-white print (been, fine), or an empty dashed frame (not printed).
 * Printed states get a chipped white border via clip-path; unprinted gets a dashed blue box.
 * @startingPoint section="Atlas" subtitle="Colour print, mono print, blank frame" viewport="700x260"
 */
export interface PrintProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `loved` = colour, `fine` = black & white, `unprinted` = empty hatched frame with a ?. */
  state?: 'loved' | 'fine' | 'unprinted';
  /** Image URL; ignored when state is `unprinted`. */
  src?: string;
  /** Handwritten caption, set on the print's white border — never over the image. */
  caption?: string;
  /** Rotation in degrees. Stay within ±4. */
  tilt?: number;
  width?: number;
  height?: number;
  /** Yellow tape strip over the top edge — reserved for `loved`. */
  tape?: boolean;
  /** Pink ★ badge, marks a favourite. */
  star?: boolean;
  /** Adds the short ink stem that pins the print to its map coordinate. */
  pin?: boolean;
  /** Which of the three torn-edge shapes to use (0-2) — vary it across neighbours. */
  edge?: number;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}
export function Print(props: PrintProps): JSX.Element;
