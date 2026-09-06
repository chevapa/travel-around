import * as React from 'react';

/**
 * The system's button. Mono uppercase label, square corners, ink border.
 * Hierarchy is carried by fill, not by size: yellow = the ONE primary action on screen,
 * paper = secondary, ink = tertiary/toggle. Pressing moves the button into its own shadow.
 * @startingPoint section="Core" subtitle="Yellow primary, paper secondary, ink toggle" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** `primary` (yellow + offset shadow) is limited to one per screen. */
  variant?: 'primary' | 'secondary' | 'invert' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  /** Pink counter pinned to the top-right corner — used for active filter count. */
  badge?: number | string;
  disabled?: boolean;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
