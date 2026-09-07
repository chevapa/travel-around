import { useState, type HTMLAttributes, type ReactNode } from "react";
import { MOBILE_BREAKPOINT_QUERY, useMediaQuery } from "../../lib/motion";
import { Button } from "../core/Button";
import { IconButton } from "../core/IconButton";

/**
 * The single bar of chrome. One bar, one hierarchy: glyph → paper → ink →
 * yellow, left to right, ascending in weight, so the primary action is
 * never out-shouted. Search is an icon, not a wide field. The bar never
 * tilts — nor does anything inside it.
 *
 * Ported from DESIGN_RISO1/components/shell/TopBar.jsx, with one
 * deliberate deviation: the reference (and readme.md's "No logo" section)
 * rotates the wordmark chip -1.5°, but readme.md's own "Tilt" rule and this
 * task's acceptance check both say the top bar and its contents never
 * rotate ("Assert transform: none on the bar and its children in a test" —
 * Task 6, DESIGN_RISO1/IMPLEMENTATION_PLAN.md). Those two statements in the
 * source docs contradict each other; this build follows the explicit,
 * testable rule and ships the wordmark flat. Also: the reference's raw
 * white hex literal on the wordmark text became var(--paper-print) to
 * satisfy the hex-colour gate.
 *
 * Task 11 addition: on mobile, TopBar keeps only the primary action
 * visible in the main row; New Frame and The Index collapse behind the
 * search glyph, revealed by tapping it. Desktop is unchanged.
 *
 * Issue 131: the search glyph called `onSearch` (a bare "it happened"
 * signal) but AtlasScreen never had anywhere to put an actual search
 * box, so clicking it did nothing visible on desktop. TopBar now owns the
 * open/closed state of an inline search field itself — `onSearch` still
 * fires (so a caller can react to the glyph being tapped at all), but the
 * field's value is controlled by the caller via `searchValue`/
 * `onSearchChange`, same pattern as a normal controlled input.
 */
export interface TopBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Wordmark text, set in the pink display chip. */
  brand?: string;
  /** Honest, labelled counts — e.g. "Zagreb · 42 visited / 74 not". Never a bare number. */
  meta?: ReactNode;
  /** Active filter count; renders as the pink badge on The Index. */
  filterCount?: number;
  onSearch?: () => void;
  /** Current text in the search field — omit to leave the field uncontrolled/absent from callers that don't wire search yet. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onNewFrame?: () => void;
  onIndex?: () => void;
  onPrint?: () => void;
  primaryLabel?: string;
}

export function TopBar({
  brand = "The Atlas",
  meta,
  filterCount,
  onSearch,
  searchValue,
  onSearchChange,
  onNewFrame,
  onIndex,
  onPrint,
  primaryLabel = "Where to? →",
  style,
  ...rest
}: TopBarProps) {
  if (import.meta.env.DEV && typeof meta === "number") {
    console.warn(
      `[TopBar] meta was passed a bare number (${meta}) — every count must be labelled (see src/model/frame.ts's formatMeta). Wrap it in a string like "Zagreb · 42 visited / 74 not".`,
    );
  }

  const isMobile = useMediaQuery(MOBILE_BREAKPOINT_QUERY);
  const [expanded, setExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const showSecondaryActions = !isMobile || expanded;
  const showSearchField = Boolean(onSearchChange) && (searchOpen || (isMobile && expanded));

  const handleSearchClick = () => {
    if (isMobile) setExpanded((e) => !e);
    setSearchOpen((open) => {
      const next = !open;
      if (!next) onSearchChange?.(""); // closing clears the query rather than leaving a stale filter active off-screen
      return next;
    });
    onSearch?.();
  };

  return (
    <div
      {...rest}
      style={{
        // Issue 132 ("new frame is broken... spawning in the middle of the
        // page"): pixel-level analysis of the reporter's own screenshot
        // showed the TopBar's own background stopped ~800px short of the
        // true window edge while a full-width border above it did not —
        // the flex row's implicit `width: auto` wasn't resolving to its
        // container's full width in whatever transient layout state the
        // screenshot caught (plausibly the pre-issue-135 chrome-gated-on-
        // `ready` architecture, which mounted this whole subtree
        // synchronously inside the same handler that kicks off
        // fitBounds()'s burst of resize events — already removed, but not
        // provably the cause).
        // Explicit width removes the ambiguity either way: this row is
        // exactly as wide as its positioned ancestor, never a computed
        // guess that could resolve against a stale/zero intermediate value.
        width: "100%",
        boxSizing: "border-box",
        background: "var(--paper-2)",
        borderBottom: "var(--stroke-heavy)",
        padding: "var(--pad-bar)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <span
          style={{
            font: "var(--display-2)",
            fontSize: 21,
            letterSpacing: "var(--display-tracking)",
            textTransform: "uppercase",
            background: "var(--pink)",
            color: "var(--paper-print)",
            padding: "2px 9px",
            display: "inline-block",
            whiteSpace: "nowrap",
          }}
        >
          {brand}
        </span>
        {meta ? (
          <span
            style={{
              font: "var(--label-sm)",
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "var(--ink)",
              border: "var(--stroke)",
              padding: "3px 7px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {meta}
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 8 }} />
      {showSearchField ? (
        <input
          type="search"
          value={searchValue ?? ""}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder="Search frames…"
          aria-label="Search frames"
          autoFocus
          style={{
            font: "var(--body)",
            fontSize: 13,
            padding: "7px 10px",
            border: "var(--stroke)",
            borderRadius: "var(--radius)",
            background: "var(--paper-1)",
            color: "var(--ink)",
            minWidth: 0,
            width: isMobile ? "100%" : 180,
          }}
        />
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <IconButton
          glyph="⌕"
          label={
            isMobile
              ? expanded
                ? "Hide more actions"
                : "Show more actions"
              : searchOpen
                ? "Close search"
                : "Search frames"
          }
          aria-expanded={isMobile ? expanded : onSearchChange ? searchOpen : undefined}
          onClick={handleSearchClick}
        />
        {showSecondaryActions ? (
          <>
            <Button variant="secondary" size="sm" onClick={onNewFrame}>
              New Frame
            </Button>
            <Button variant="invert" size="sm" badge={filterCount || undefined} onClick={onIndex}>
              The Index
            </Button>
          </>
        ) : null}
        <Button variant="primary" size="md" onClick={onPrint}>
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}
