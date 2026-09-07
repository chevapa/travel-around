import type { HTMLAttributes } from "react";
import type { FrameState } from "../../model/frame";

/**
 * The album view — the same dataset as the Atlas, laid out as a darkroom
 * contact sheet on the ink surface. The Atlas answers "where"; the Contact
 * Sheet answers "what have we actually done this year", and the blank
 * cells are the wishlist.
 *
 * Ported from DESIGN_RISO1/components/shell/ContactSheet.jsx, plus Task
 * 7's "sortable by date and by drive time" (the reference has no sort
 * control at all). See sortContactFrames below — ContactSheet always
 * sorts internally by the current `sortBy`, so there's exactly one place
 * the ordering logic lives, not a copy in every caller.
 *
 * Honest scope note: the current dataset has no visit-date field yet (see
 * src/model/frame.ts) — sorting by date works mechanically the moment
 * that data exists, but until then every frame sorts as "undated" (last).
 *
 * Each cell carries a `riso-contact-cell` class — styles/print.css uses it
 * (Task 11: "prints cleanly to PDF... no clipped rows") to keep a cell
 * from being cut across a page break.
 *
 * Issue 134: with the real 116-frame dataset (mostly unprinted, so mostly
 * "?" cells) the grid is taller than the viewport, and AtlasScreen mounts
 * this inside a `height: 100vh; overflow: hidden` root — so rows below the
 * fold used to be genuinely unreachable, not just visually cut off, and
 * the only way back to the Atlas (a button below the Legend, positioned
 * separately) could be pushed out of view with it. Fixed two ways: the
 * grid itself scrolls internally (`maxHeight`/`overflowY` below, sized to
 * leave room for the header), and there's now always a close control in
 * the sheet's own header, not dependent on anything else's position.
 *
 * Issue 156: cells rendered as bare photos — no visible name, and (because
 * AtlasScreen never wired `onPick`) not actually clickable to anything.
 * Every cell now shows a small caption strip with the frame's name, and
 * carries an id (see ContactFrame.id) so a caller can safely open the
 * right frame regardless of the current sort order.
 */
export interface ContactFrame {
  /** Issue 156: onPick used to only get a sorted-array index back, which
   * silently pointed at the wrong frame once `sortBy` reordered the grid
   * relative to the caller's own source array. Carrying the real id lets a
   * caller look the frame up directly, independent of sort order. */
  id?: string;
  name?: string;
  src?: string;
  state?: FrameState;
  /** ISO date string, when known (visit-history data doesn't exist yet — see docstring above). */
  date?: string;
  driveMinutes?: number;
}

export type ContactSortBy = "date" | "driveTime";

/** Pure, exported separately so ordering is unit-testable without rendering. Missing values always sort last, in both directions — a lack of data is never mistaken for "soonest"/"closest". */
export function sortContactFrames(frames: ContactFrame[], sortBy: ContactSortBy): ContactFrame[] {
  const withIndex = frames.map((f, i) => ({ f, i }));
  withIndex.sort((a, b) => {
    if (sortBy === "date") {
      const aTime = a.f.date ? Date.parse(a.f.date) : null;
      const bTime = b.f.date ? Date.parse(b.f.date) : null;
      if (aTime === null && bTime === null) return a.i - b.i;
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return bTime - aTime; // most recent first
    }
    const aDrive = a.f.driveMinutes ?? null;
    const bDrive = b.f.driveMinutes ?? null;
    if (aDrive === null && bDrive === null) return a.i - b.i;
    if (aDrive === null) return 1;
    if (bDrive === null) return -1;
    return aDrive - bDrive; // closest first
  });
  return withIndex.map(({ f }) => f);
}

export interface ContactSheetProps extends HTMLAttributes<HTMLDivElement> {
  frames?: ContactFrame[];
  columns?: number;
  title?: string;
  /** Date range or sort description, e.g. "2023—2026". */
  range?: string;
  onPick?: (frame: ContactFrame, index: number) => void;
  sortBy?: ContactSortBy;
  onSortChange?: (sortBy: ContactSortBy) => void;
  /** Issue 134: always-visible close control, independent of whatever else happens to be on screen. */
  onClose?: () => void;
}

const SORT_LABEL: Record<ContactSortBy, string> = { date: "By date", driveTime: "By drive time" };

export function ContactSheet({
  frames = [],
  columns = 6,
  title = "Contact sheet",
  range,
  onPick,
  sortBy = "date",
  onSortChange,
  onClose,
  style,
  ...rest
}: ContactSheetProps) {
  const sorted = sortContactFrames(frames, sortBy);
  return (
    <div
      {...rest}
      style={{
        background: "var(--ink)",
        border: "var(--stroke-heavy)",
        boxShadow: "var(--lift-3)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        // Issue 134: the grid can be taller than the viewport (mostly-"?"
        // real dataset) — scroll it internally rather than letting it run
        // off the bottom of a `overflow: hidden` ancestor, unreachable.
        maxHeight: "calc(100vh - 112px)",
        minHeight: 0,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          font: "var(--label-sm)",
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--yellow)",
          flexWrap: "wrap",
          gap: 8,
          flex: "0 0 auto",
        }}
      >
        <span>
          {title} · {frames.length}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {range ? <span style={{ color: "var(--text-on-invert)" }}>{range}</span> : null}
          {onClose ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Close contact sheet"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onClose();
                }
              }}
              style={{
                cursor: "pointer",
                color: "var(--text-on-invert)",
                border: "1.5px solid var(--text-on-invert)",
                padding: "2px 7px",
                lineHeight: 1,
              }}
            >
              ✕
            </span>
          ) : null}
          {onSortChange ? (
            <div role="group" aria-label="Sort contact sheet" style={{ display: "flex", gap: 6 }}>
              {(Object.keys(SORT_LABEL) as ContactSortBy[]).map((key) => (
                <span
                  key={key}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sortBy === key}
                  onClick={() => onSortChange(key)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onSortChange(key);
                    }
                  }}
                  style={{
                    padding: "3px 7px",
                    cursor: "pointer",
                    background: sortBy === key ? "var(--yellow)" : "transparent",
                    color: sortBy === key ? "var(--ink)" : "var(--text-on-invert)",
                    border: "1.5px solid var(--yellow)",
                  }}
                >
                  {SORT_LABEL[key]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 6, overflowY: "auto", minHeight: 0 }}>
        {sorted.map((f, i) => (
          <div
            key={f.id ?? i}
            className="riso-contact-cell"
            role={onPick ? "button" : undefined}
            tabIndex={onPick ? 0 : undefined}
            // Only the unprinted blank needs the label here — the printed
            // cell's own <img alt> already names it.
            aria-label={f.state === "unprinted" ? f.name : undefined}
            onClick={() => onPick?.(f, i)}
            onKeyDown={
              onPick
                ? (e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onPick(f, i);
                    }
                  }
                : undefined
            }
            style={{
              position: "relative",
              aspectRatio: "4 / 3",
              display: "flex",
              cursor: onPick ? "pointer" : "default",
              ...(f.state === "unprinted"
                ? { border: "1.5px dashed var(--unprinted-edge)", alignItems: "center", justifyContent: "center" }
                : { border: "1.5px solid var(--paper-2)" }),
            }}
          >
            {f.state === "unprinted" ? (
              <span aria-hidden="true" style={{ color: "var(--unprinted-edge)", font: "var(--display-3)", fontSize: 16 }}>
                ?
              </span>
            ) : (
              <img
                src={f.src}
                alt={f.name || ""}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: f.state === "fine" ? "grayscale(1)" : "none",
                }}
              />
            )}
            {/* Issue 156: "no naming nothing" — every cell, printed or
                blank, names the place it stands for. */}
            {f.name ? (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(25,21,16,.72)",
                  color: "var(--text-on-invert)",
                  font: "var(--label-sm)",
                  fontSize: 9,
                  letterSpacing: ".04em",
                  padding: "3px 4px",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
