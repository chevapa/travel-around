import * as React from 'react';

/**
 * The detail panel for one frame. Order is fixed and deliberate: NAME first, then the print
 * (or the blank frame), then description, then hard data, and only then tags — the live site's
 * mistake was five metadata chips above the place name. Docks into the right-hand panel slot
 * rather than floating over the map, so the pin and its surroundings stay visible.
 * @startingPoint section="Shell" subtitle="Frame detail — name first, tags last" viewport="700x420"
 */
export interface FrameCardProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  state?: 'loved' | 'fine' | 'unprinted';
  src?: string;
  description?: string;
  /** e.g. "52 min" — the number people actually decide on, so it gets an ink chip. */
  driveTime?: string;
  distance?: string;
  /** Typical time spent at the place, e.g. "~45 min". */
  stay?: string;
  tags?: string[];
  onClose?: () => void;
  onNearby?: () => void;
  onToPrint?: () => void;
  onRoute?: () => void;
}
export function FrameCard(props: FrameCardProps): JSX.Element;
