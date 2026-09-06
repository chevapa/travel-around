import type { CSSProperties, HTMLAttributes, MouseEventHandler } from "react";

/**
 * THE signature component. One place on the Atlas, rendered as a
 * photographic print. The three states are the product's whole semantic: a
 * colour print (been, loved), a black-and-white print (been, fine), or an
 * empty dashed frame (not printed).
 *
 * Ported from DESIGN_RISO1/components/atlas/Print.jsx — see Print.prompt.md.
 * Highest-risk component in the plan (Task 4); requirements beyond the
 * reference are called out inline below.
 */
export interface PrintProps extends HTMLAttributes<HTMLDivElement> {
  /** `loved` = colour, `fine` = black & white, `unprinted` = empty hatched frame with a ?. */
  state?: "loved" | "fine" | "unprinted";
  /** Image URL; ignored when state is `unprinted` — no image is requested. */
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
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const TORN = [
  "polygon(2% 3%,42% 0%,74% 4%,100% 1%,98% 44%,100% 82%,97% 100%,58% 97%,22% 100%,1% 96%,3% 52%)",
  "polygon(3% 1%,40% 4%,72% 0%,100% 3%,96% 42%,100% 76%,95% 100%,60% 96%,26% 100%,2% 96%,5% 44%)",
  "polygon(2% 2%,44% 0%,76% 4%,100% 1%,97% 40%,100% 74%,98% 100%,56% 97%,24% 100%,1% 97%,3% 46%)",
] as const;

/**
 * Below this width (matches --print-min in tokens/spacing.css) a print
 * collapses to a plain square. Hardcoded rather than read from the CSS
 * custom property because the collapse decision has to happen in JS,
 * before any style is written — keep this in sync with the token by hand.
 */
const PRINT_MIN = 28;

/**
 * Derives a stable (edge, tilt) pair from a frame's id — deterministic
 * across re-renders (same id -> same result, always), so a print never
 * jitters, but varied enough that adjacent prints don't visually match.
 * Task 4 requirement: "derive them deterministically from frame.id (hash ->
 * index 0-2, angle in ±4°)".
 */
export function derivePrintTransform(id: string): { edge: 0 | 1 | 2; tilt: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const unsigned = hash >>> 0;
  const edge = (unsigned % 3) as 0 | 1 | 2;
  // A second, differently-mixed slice of the same hash for tilt, so edge
  // and tilt don't move in lockstep for ids that happen to share (hash % 3).
  const tiltSteps = 17; // arbitrary resolution across the ±4° budget
  const tiltUnit = (Math.floor(unsigned / 3) % tiltSteps) / (tiltSteps - 1); // 0..1
  const tilt = Math.round((tiltUnit * 8 - 4) * 10) / 10; // -4..4, one decimal
  return { edge, tilt };
}

export function Print({
  state = "loved",
  src,
  caption,
  tilt = -3,
  width = 84,
  height = 62,
  tape = false,
  star,
  pin = false,
  edge = 0,
  onClick,
  style,
  ...rest
}: PrintProps) {
  const unprinted = state === "unprinted";
  const collapsed = width < PRINT_MIN;

  const sheetBase: CSSProperties = {
    position: "relative",
    cursor: onClick ? "pointer" : "default",
    // Below --print-min the print is a plain square, but the tap target
    // never shrinks below --tap-min (44px) — this is what Task 4's
    // getBoundingClientRect test measures.
    minWidth: "var(--tap-min)",
    minHeight: "var(--tap-min)",
    boxSizing: "border-box",
  };

  let sheet;
  if (collapsed) {
    // Plain square: colour fill (loved), grey fill (fine), or dashed
    // outline (unprinted) — no photo, no torn edge, no caption at this size.
    const fill = state === "loved" ? "var(--state-loved)" : state === "fine" ? "var(--state-fine)" : "transparent";
    sheet = (
      <div
        onClick={onClick}
        style={{
          ...sheetBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width,
            height,
            background: unprinted ? "var(--paper-1)" : fill,
            border: unprinted ? "var(--stroke-dashed)" : "none",
          }}
        />
      </div>
    );
  } else {
    const body = unprinted ? (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "var(--hatch)",
          font: "var(--display-3)",
          fontSize: Math.max(18, Math.round(height * 0.42)),
          color: "var(--blue)",
          lineHeight: 1,
        }}
      >
        ?
      </div>
    ) : (
      <img
        src={src}
        alt={caption || ""}
        style={{
          display: "block",
          width,
          height,
          objectFit: "cover",
          filter: state === "fine" ? "grayscale(1) contrast(1.15) brightness(1.04)" : "saturate(1.2) contrast(1.05)",
        }}
      />
    );

    sheet = (
      <div
        onClick={onClick}
        style={{
          ...sheetBase,
          padding: unprinted ? "5px 5px 15px" : "5px 5px 19px",
          background: unprinted ? "var(--paper-1)" : "var(--paper-print)",
          border: unprinted ? "var(--stroke-dashed)" : "none",
          clipPath: unprinted ? "none" : TORN[edge % TORN.length],
          boxShadow: unprinted ? "none" : "var(--lift-print)",
        }}
      >
        {body}
        {tape ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -11,
              left: "50%",
              transform: "translateX(-50%) rotate(2deg)",
              width: Math.max(40, width * 0.6),
              height: 20,
              background: "var(--tape)",
              borderLeft: "1px dashed rgba(25,21,16,.35)",
              borderRight: "1px dashed rgba(25,21,16,.35)",
            }}
          />
        ) : null}
        {/* Caption sits in the white border strip created by the extra
            bottom padding above — as a sibling of the image, never a
            descendant, and never overlapping it. See Print.test.tsx. */}
        {caption ? (
          <span
            style={{
              position: "absolute",
              left: 8,
              bottom: 2,
              font: "var(--hand-sm)",
              color: state === "loved" ? "var(--blue)" : state === "fine" ? "var(--ink-40)" : "var(--blue)",
            }}
          >
            {caption}
          </span>
        ) : null}
        {star ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -8,
              right: -9,
              width: 20,
              height: 20,
              background: "var(--pink)",
              border: "var(--stroke)",
              borderRadius: "50%",
              color: "var(--paper-print)",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ★
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div {...rest} style={{ transform: `rotate(${tilt}deg)`, display: "inline-block", ...style }}>
      {sheet}
      {pin ? (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            width: 2.5,
            height: 12,
            background: unprinted ? "var(--blue)" : "var(--ink)",
            margin: "0 auto",
          }}
        />
      ) : null}
    </div>
  );
}
