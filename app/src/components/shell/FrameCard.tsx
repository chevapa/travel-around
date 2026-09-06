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
 * Ported from DESIGN_RISO1/components/shell/FrameCard.jsx, with one fix
 * from Task 8 (composing the real screen, issue #93): the reference makes
 * "Same roll" variant="primary", same as TopBar's "To Print" (Task 6) —
 * both yellow, both visible at once once a card is open, which breaks the
 * "exactly one primary per screen" rule (Button's own dev-mode warning
 * catches this; it fired for real once this was wired into AtlasScreen).
 * TopBar's primary is the screen-wide "give me somewhere to go" action, so
 * it keeps the yellow; the explore-nearby action — scoped to one frame,
 * not a replacement for it — became variant="accent" (pink) instead.
 * Still the loudest thing in the card, just not competing for the one
 * yellow slot.
 *
 * Issue 133: these two buttons rendered but did nothing (AtlasScreen
 * never wired `onNearby`/`onToPrint`/`onRoute`) and their labels ("Same
 * roll", "To Print") read as jargon — renamed to plain verbs describing
 * what each one actually does. Issue 128: tags are now a real filter
 * control (`onTagClick`), not inert labels. Issue 122: an unprinted frame
 * with a recognised category now shows that category's illustration
 * instead of the "not visited yet" hatch box (still the fallback when no
 * category is recognised, e.g. a brand-new frame with no tags yet).
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
  /** The tag currently driving the map filter, if any — shows which chip is active. */
  activeTag?: string | null;
  /** Issue 109 checklist: "link to Google for a place" — when set, the name itself opens a web search for it. */
  searchUrl?: string;
  onClose?: () => void;
  onNearby?: () => void;
  onToPrint?: () => void;
  onRoute?: () => void;
  onTagClick?: (tag: string) => void;
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
  activeTag,
  searchUrl,
  onClose,
  onNearby,
  onToPrint,
  onRoute,
  onTagClick,
  style,
  ...rest
}: FrameCardProps) {
  const unprinted = state === "unprinted";
  // An unprinted frame with a recognised category shows that illustration
  // rather than the hatch placeholder (issue 122) — `src` is already
  // resolved to a category image by the caller (AtlasScreen's photoFor)
  // when one exists, so "unprinted but src is set" is exactly that case.
  const showPlaceholder = unprinted && !src;
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
            {searchUrl ? (
              <a href={searchUrl} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
                {name}
              </a>
            ) : (
              name
            )}
          </h3>
          <IconButton glyph="✕" label="Close frame" size={26} onClick={onClose} style={{ border: "none", background: "transparent", minWidth: 26, minHeight: 26 }} />
        </div>
        <div style={{ height: 5, background: "var(--pink)", width: 88, flex: "0 0 auto" }} />
        {showPlaceholder ? (
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
              not visited
              <br />
              yet
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
                filter: state === "fine" ? "grayscale(1) contrast(1.15)" : unprinted ? "grayscale(0.35) brightness(1.05)" : "saturate(1.2) contrast(1.05)",
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
              <Tag key={t} active={activeTag === t} onClick={onTagClick ? () => onTagClick(t) : undefined}>
                {t}
              </Tag>
            ))}
          </div>
        ) : null}
      </div>
      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
        <Button variant="accent" onClick={onNearby} style={{ width: "100%" }}>
          Similar places →
        </Button>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={onToPrint} style={{ flex: 1 }}>
            ★ Want to go
          </Button>
          <Button variant="secondary" size="sm" onClick={onRoute} style={{ flex: 1 }}>
            ↗ Route
          </Button>
        </div>
      </div>
    </div>
  );
}
