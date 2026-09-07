import type { KeyboardEvent } from "react";
import { Paper } from "../core/Paper";

/**
 * Issue 109 checklist item 2: "message when filter changed." Clicking a
 * filter badge directly on the map (a Legend row, or a card's tag/
 * country/season badge — issues 128/145) changes what's shown with no
 * feedback of its own; the Index panel's persistent match-count footer
 * only helps if that panel happens to be open. Ported from the live
 * site's equivalent (`js/filters.js`'s `showFilterToast`) as a small,
 * auto-dismissing strip rather than the live site's DOM-mutating toast.
 *
 * Deliberately scoped to filters set from map-level clicks (Legend, card
 * badges) — the Index panel's own checkbox rows already show their
 * effect immediately via that panel's own match-count footer, so a toast
 * there would just repeat visible state back at the user.
 */
export interface FilterToastProps {
  message: string;
  onReset?: () => void;
}

export function FilterToast({ message, onReset }: FilterToastProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onReset?.();
    }
  };

  return (
    <Paper
      tone="ink"
      lift="sm"
      pad="8px 8px 8px 12px"
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        font: "var(--label-sm)",
        fontSize: 11,
        letterSpacing: ".08em",
        textTransform: "uppercase",
      }}
    >
      <span>{message}</span>
      {onReset ? (
        <span
          role="button"
          tabIndex={0}
          onClick={onReset}
          onKeyDown={handleKeyDown}
          style={{ background: "var(--yellow)", color: "var(--ink)", padding: "4px 8px", cursor: "pointer", flex: "0 0 auto" }}
        >
          Reset
        </span>
      ) : null}
    </Paper>
  );
}
