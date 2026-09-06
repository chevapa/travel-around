import type { HTMLAttributes } from "react";
import { Button } from "../core/Button";
import { IconButton } from "../core/IconButton";
import { TapeStrip } from "../core/Paper";
import { Tag } from "../core/Tag";
import type { FrameState } from "../../model/frame";

/**
 * The detail panel for one frame. Order is fixed and deliberate: NAME
 * first, then the print (or the blank frame), then description, then hard
 * data, and only then tags — the live site's mistake (MED 06, AUDIT.md)
 * was five metadata chips above the place name. Docks into the panel slot
 * (Task 7's PanelSlot) rather than floating over the map, so the pin and
 * its surroundings stay visible — "anchored, never floating" is satisfied
 * structurally by only ever being mounted inside that slot.
 *
 * Ported from DESIGN_RISO1/components/shell/FrameCard.jsx.
 *
 * Known cross-component collision, not fixed here: this card's "Same roll"
 * button is variant="primary" (matching the reference), and so is
 * TopBar's "To Print" (Task 6) — both yellow, both visible at once once a
 * card is open alongside the bar. That's two primaries on screen, which
 * breaks the "exactly one" rule Button's own dev-mode warning checks for.
 * Flagged on issue #93 (Task 8, composing the real screen) rather than
 * guessed at here, since resolving it means deciding product intent (does
 * opening a card temporarily demote the bar's primary?), not a component
 * detail.
 */
export interface FrameCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  state?: FrameState;
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

export function FrameCard({
  name,
  state = "unprinted",
  src,
  description,
  driveTime,
  distance,
  stay,
  tags = [],
  onClose,
  onNearby,
  onToPrint,
  onRoute,
  style,
  ...rest
}: FrameCardProps) {
  const unprinted = state === "unprinted";
  return (
    <div
      {...rest}
      style={{
        position: "relative",
        background: "var(--paper-2)",
        border: "var(--stroke-heavy)",
        boxShadow: "var(--lift-3)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      <TapeStrip />
      <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 11, flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <h3
            style={{
              margin: 0,
              font: "var(--display-3)",
              letterSpacing: "var(--display-tracking-tight)",
              textTransform: "uppercase",
            }}
          >
            {name}
          </h3>
          <IconButton glyph="✕" label="Close frame" size={26} onClick={onClose} style={{ border: "none", background: "transparent", minWidth: 26, minHeight: 26 }} />
        </div>
        <div style={{ height: 5, background: "var(--pink)", width: 88, flex: "0 0 auto" }} />
        {unprinted ? (
          <div style={{ padding: "5px 5px 20px", background: "var(--paper-1)", border: "var(--stroke-dashed)", flex: "0 0 auto" }}>
            <div
              style={{
                height: 74,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: "var(--hatch)",
                font: "var(--label-sm)",
                fontSize: 9,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: "var(--blue)",
                textAlign: "center",
                padding: "0 8px",
              }}
            >
              frame not
              <br />
              printed yet
            </div>
          </div>
        ) : (
          <div style={{ padding: "5px 5px 5px", background: "var(--paper-print)", boxShadow: "var(--lift-print)", flex: "0 0 auto" }}>
            <img
              src={src}
              alt={name}
              style={{
                display: "block",
                width: "100%",
                height: 96,
                objectFit: "cover",
                filter: state === "fine" ? "grayscale(1) contrast(1.15)" : "saturate(1.2) contrast(1.05)",
              }}
            />
          </div>
        )}
        {description ? <p style={{ margin: 0, font: "var(--body-sm)", color: "var(--text-strong)" }}>{description}</p> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "0 0 auto" }}>
          {driveTime ? (
            <Tag tone="ink">
              {driveTime}
              {distance ? " · " + distance : ""}
            </Tag>
          ) : null}
          {stay ? <Tag>Stay {stay}</Tag> : null}
        </div>
        {tags.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: "0 0 auto" }}>
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
        <Button variant="primary" onClick={onNearby} style={{ width: "100%" }}>
          Same roll →
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onToPrint} style={{ flex: 1 }}>
            ★ To Print
          </Button>
          <Button variant="secondary" size="sm" onClick={onRoute} style={{ flex: 1 }}>
            ↗ Route
          </Button>
        </div>
      </div>
    </div>
  );
}
