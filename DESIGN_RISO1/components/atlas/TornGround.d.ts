import * as React from 'react';

/**
 * The Atlas basemap. Geography is torn out of OTHER photographs — collage fragments with
 * ragged clip-path edges, then sunk under flat riso ink washes (blue water, green hills,
 * pink roads) so they read as terrain rather than as pictures. Replaces the stock consumer
 * basemap entirely, which is what lets the Prints on top own all the saturation.
 * @startingPoint section="Atlas" subtitle="Torn-collage terrain under riso ink washes" viewport="700x300"
 */
export interface TornGroundProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 1-4 image URLs used as land fragments; they cycle if you pass fewer than four. */
  fragments?: string[];
  /** Pink road lines. Off for a water-heavy or very dense page. */
  roads?: boolean;
}
export function TornGround(props: TornGroundProps): JSX.Element;
