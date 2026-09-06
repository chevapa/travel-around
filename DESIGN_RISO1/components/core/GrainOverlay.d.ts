import * as React from 'react';

/**
 * The halftone grain that makes RISO1 read as printed. Mount ONCE, as the last child of the
 * outermost positioned container, so a single dot screen sits over the whole composition.
 * Never apply grain per element — stacked screens moiré and destroy text contrast.
 * @startingPoint section="Core" subtitle="Single halftone screen over the whole page" viewport="700x150"
 */
export interface GrainOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Override the default .5; keep it under .6 or body copy starts to mottle. */
  opacity?: number;
}
export function GrainOverlay(props: GrainOverlayProps): JSX.Element;
