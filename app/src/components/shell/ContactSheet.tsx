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
 */
export interface ContactFrame {
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
        {sorted.map((f, i) =>
          f.state === "unprinted" ? (
            <span
              key={i}
              className="riso-contact-cell"
              onClick={() => onPick?.(f, i)}
              style={{
                aspectRatio: "4 / 3",
                border: "1.5px dashed var(--unprinted-edge)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--unprinted-edge)",
                font: "var(--display-3)",
                fontSize: 16,
                cursor: onPick ? "pointer" : "default",
              }}
            >
              ?
            </span>
          ) : (
            <img
              key={i}
              className="riso-contact-cell"
              src={f.src}
              alt={f.name || ""}
              onClick={() => onPick?.(f, i)}
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                border: "1.5px solid var(--paper-2)",
                filter: f.state === "fine" ? "grayscale(1)" : "none",
                cursor: onPick ? "pointer" : "default",
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}
