import { Fragment, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import type { Ring } from "./isochrone";

/**
 * Drive-time isochrone furniture. The dashed rings say "an hour from
 * home"; the yellow stamped pennant labels them. Drive time is how day
 * trips are actually chosen, so these are first-class map elements, not a
 * decoration.
 *
 * Ported from DESIGN_RISO1/components/atlas/RingLabel.jsx. RingSet's ring
 * shape changed from the reference's mock "top left bottom" inset string
 * to a single symmetric `insetPercent` per ring — see isochrone.ts for why:
 * Task 5 replaces the mock percentages with a real computation, and a real
 * drive-time radius is naturally a circle (one radius), not an
 * independently-adjustable box.
 */
export interface RingLabelProps extends HTMLAttributes<HTMLSpanElement> {
  /** Short label — "1 H", "2 H", "30 MIN". */
  children?: ReactNode;
  tilt?: number;
}

export function RingLabel({ children = "1 H", tilt = -4, style, ...rest }: RingLabelProps) {
  return (
    <span
      {...rest}
      style={{
        display: "inline-block",
        background: "var(--yellow)",
        border: "var(--stroke)",
        padding: "2px 8px",
        font: "var(--numeral)",
        fontSize: 11,
        color: "var(--ink)",
        transform: `rotate(${tilt}deg)`,
        borderRadius: "var(--radius)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export interface RingSetProps {
  /** From isochrone.ts's computeIsochroneRings — one symmetric percentage inset per ring, largest (furthest) first for correct dashed-alpha layering. */
  rings?: Ring[];
}

const DEFAULT_RINGS: Ring[] = [
  { insetPercent: 4, label: "2 H" },
  { insetPercent: 22, label: "1 H" },
];

/** The dashed concentric rings themselves, with their yellow pennant labels pinned to each ring's left edge (the map's emptiest spot, per RingLabel.prompt.md). Place inside a positioned Atlas container. */
export function RingSet({ rings = DEFAULT_RINGS }: RingSetProps) {
  return (
    <Fragment>
      {rings.map((r, i) => {
        const pos: CSSProperties = {
          position: "absolute",
          top: `${r.insetPercent}%`,
          left: `${r.insetPercent}%`,
          right: `${r.insetPercent}%`,
          bottom: `${r.insetPercent}%`,
        };
        return (
          <Fragment key={i}>
            <span
              aria-hidden="true"
              style={{
                ...pos,
                border: `3px dashed rgba(25,21,16,${i === 0 ? 0.5 : 0.38})`,
                borderRadius: "50%",
              }}
            />
            {r.label ? (
              <RingLabel
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${r.insetPercent}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%) rotate(-4deg)",
                }}
              >
                {r.label}
              </RingLabel>
            ) : null}
          </Fragment>
        );
      })}
    </Fragment>
  );
}
