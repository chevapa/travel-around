import type { CSSProperties, HTMLAttributes, KeyboardEvent } from "react";
import { StampCheck } from "../core/StampCheck";

/**
 * The filter panel, built as a physical card index: cardboard tab dividers
 * instead of accordions, stamped ✕ marks instead of checkboxes, a pinned
 * ink footer that always states the match count. Every label is full-ink
 * at 16px — faded filter labels are the CRIT 02 fix this component exists
 * to prevent (see AUDIT.md).
 *
 * Ported from DESIGN_RISO1/components/shell/IndexPanel.jsx, with one API
 * change beyond the reference: the reference only ever receives rows for
 * the currently active tab, which makes "collapsed sections show their
 * active values as removable chips" (Task 7) impossible to implement — a
 * collapsed section's checked rows aren't in scope. This takes `sections`
 * (one row-list per tab) instead of a flat `rows`, so every section's
 * state is visible regardless of which tab is active.
 */
export interface IndexRow {
  key: string;
  label: string;
  count: number;
  checked?: boolean;
  /** Optional swatch style showing the state's map colour. */
  swatch?: CSSProperties;
}

export interface IndexSection {
  tab: string;
  rows: IndexRow[];
}

export interface IndexPanelProps extends HTMLAttributes<HTMLDivElement> {
  sections: IndexSection[];
  activeTab?: string;
  onTab?: (tab: string) => void;
  onToggleRow?: (tab: string, key: string) => void;
  /** Number of frames matching the current filters — always shown, always labelled. */
  footerCount?: number;
  sortLabel?: string;
  onSort?: () => void;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onRemove();
    }
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Remove ${label} filter`}
      onClick={onRemove}
      onKeyDown={handleKeyDown}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 6px",
        font: "var(--label-sm)",
        fontSize: 9,
        letterSpacing: "var(--label-tracking)",
        textTransform: "uppercase",
        background: "var(--ink)",
        color: "var(--text-on-invert)",
        border: "1.5px solid var(--ink)",
        cursor: "pointer",
      }}
    >
      {label}
      <span aria-hidden="true">✕</span>
    </span>
  );
}

export function IndexPanel({
  sections,
  activeTab,
  onTab,
  onToggleRow,
  footerCount,
  sortLabel = "By drive time",
  onSort,
  style,
  ...rest
}: IndexPanelProps) {
  const tabs = sections.map((s) => s.tab);
  const resolvedActiveTab = activeTab ?? tabs[0];
  const activeSection = sections.find((s) => s.tab === resolvedActiveTab) ?? sections[0];
  const collapsedSectionsWithChips = sections.filter((s) => s.tab !== resolvedActiveTab && s.rows.some((r) => r.checked));

  return (
    <div
      {...rest}
      style={{
        background: "var(--paper-2)",
        border: "var(--stroke-heavy)",
        boxShadow: "var(--lift-3)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "100%",
        ...style,
      }}
    >
      <div style={{ display: "flex", padding: "0 12px", marginTop: -2, flex: "0 0 auto" }}>
        {tabs.map((t) => (
          <span
            key={t}
            onClick={() => onTab?.(t)}
            role={onTab ? "button" : undefined}
            aria-pressed={onTab ? t === resolvedActiveTab : undefined}
            tabIndex={onTab ? 0 : undefined}
            onKeyDown={
              onTab
                ? (e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      onTab(t);
                    }
                  }
                : undefined
            }
            style={{
              background: t === resolvedActiveTab ? "var(--yellow)" : "var(--paper-1)",
              border: "var(--stroke-heavy)",
              borderTop: "none",
              borderLeft: t === tabs[0] ? undefined : "none",
              padding: "6px 11px",
              font: "var(--label-sm)",
              letterSpacing: ".1em",
              textTransform: "uppercase",
              cursor: onTab ? "pointer" : "default",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      {collapsedSectionsWithChips.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 12px 0", flex: "0 0 auto" }}>
          {collapsedSectionsWithChips.flatMap((section) =>
            section.rows
              .filter((r) => r.checked)
              .map((r) => (
                <Chip key={`${section.tab}:${r.key}`} label={`${section.tab}: ${r.label}`} onRemove={() => onToggleRow?.(section.tab, r.key)} />
              )),
          )}
        </div>
      ) : null}

      <div style={{ padding: "var(--pad-panel)", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", minHeight: 0 }}>
        {activeSection?.rows.map((r, i) => (
          <div
            key={r.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "10px 4px",
              borderBottom: i === activeSection.rows.length - 1 ? "none" : "var(--stroke-dashed-quiet)",
            }}
          >
            <StampCheck checked={!!r.checked} onChange={() => onToggleRow?.(activeSection.tab, r.key)} aria-label={r.label} />
            {r.swatch ? <span aria-hidden="true" style={{ width: 22, height: 16, flex: "0 0 auto", ...r.swatch }} /> : null}
            <span style={{ font: "var(--body)", color: "var(--text-strong)" }}>{r.label}</span>
            <span style={{ marginLeft: "auto", font: "var(--numeral)", color: "var(--ink-55)" }}>{r.count}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "var(--ink)",
          padding: "11px 16px",
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          font: "var(--label-sm)",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--text-on-invert)",
        }}
      >
        <span>{footerCount} frames match</span>
        <span
          onClick={onSort}
          role={onSort ? "button" : undefined}
          tabIndex={onSort ? 0 : undefined}
          onKeyDown={
            onSort
              ? (e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onSort();
                  }
                }
              : undefined
          }
          style={{ background: "var(--yellow)", color: "var(--ink)", padding: "6px 10px", cursor: onSort ? "pointer" : "default" }}
        >
          {sortLabel}
        </span>
      </div>
    </div>
  );
}
