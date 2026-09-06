import * as React from 'react';

/**
 * Small uppercase mono tag for a frame's categories (country, kind, season).
 * Tags live at the BOTTOM of a FrameCard — never above the place name.
 * @startingPoint section="Core" subtitle="Category tags and ink data chips" viewport="700x150"
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'outline' | 'ink' | 'yellow';
  children?: React.ReactNode;
}
export function Tag(props: TagProps): JSX.Element;
