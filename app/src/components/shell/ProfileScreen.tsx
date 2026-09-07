import type { HTMLAttributes } from "react";
import { STATE_LABEL } from "../../model/frame";
import type { ExplorationStats } from "../../model/stats";

/**
 * The traveller's own progress, at a glance — issue 142: the live site's
 * profile/stats screen (`js/stats.js`, `js/statsEngine.js`) had no RISO1
 * equivalent. The Contact Sheet answers "what have I printed"; this
 * answers "how much of the atlas have I actually covered."
 *
 * Deliberately does not port `js/profile.js`'s characteristic/season
 * affinity or favourite-place scoring — that needs a real interaction
 * log (issue 141's recommendation/swipe screen, not built yet in this
 * app) to mean anything. This covers exactly what issue 142 asks for:
 * visited/discovered place counts and a country-by-country breakdown.
 * Same "always recomputed from the frame data, never a separate stored
 * state" principle as the live site's own stats screen — see
 * `model/stats.ts`'s `computeExplorationStats`.
 *
 * Visually a Contact-Sheet sibling (dark ink surface, yellow eyebrow, the
 * same always-present close control), not a new visual language.
 */
export interface ProfileScreenProps extends HTMLAttributes<HTMLDivElement> {
  stats: ExplorationStats;
  onClose?: () => void;
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ border: "1.5px solid rgba(246,240,222,.3)", padding: "9px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ font: "var(--display-3)", fontSize: 22, color: "var(--text-on-invert)" }}>{value}</span>
      <span style={{ font: "var(--label-sm)", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-on-invert)" }}>{label}</span>
    </div>
  );
}

export function ProfileScreen({ stats, onClose, style, ...rest }: ProfileScreenProps) {
  return (
    <div
      {...rest}
      style={{
        background: "var(--ink)",
        border: "var(--stroke-heavy)",
        boxShadow: "var(--lift-3)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxHeight: "calc(100vh - 112px)",
        minHeight: 0,
        overflowY: "auto",
        color: "var(--text-on-invert)",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flex: "0 0 auto" }}>
        <span style={{ font: "var(--label-sm)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--yellow)" }}>Profile</span>
        {onClose ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Close profile"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onClose();
              }
            }}
            style={{ cursor: "pointer", color: "var(--text-on-invert)", border: "1.5px solid var(--text-on-invert)", padding: "2px 7px", lineHeight: 1 }}
          >
            ✕
          </span>
        ) : null}
      </div>

      <div style={{ flex: "0 0 auto" }}>
        <p style={{ margin: 0, font: "var(--display-2)", fontSize: 34, lineHeight: 1 }}>{stats.percent}%</p>
        <p style={{ margin: "4px 0 0", font: "var(--body-sm)" }}>
          {stats.explored} of {stats.total} frames explored
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, flex: "0 0 auto" }}>
        <StatTile value={stats.loved} label={STATE_LABEL.loved} />
        <StatTile value={stats.fine} label={STATE_LABEL.fine} />
        <StatTile value={stats.unprinted} label={STATE_LABEL.unprinted} />
        <StatTile value={stats.wantReturn} label="Want to return" />
      </div>

      {stats.countryBreakdown.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
          <span style={{ font: "var(--label-sm)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--yellow)", flex: "0 0 auto" }}>By country</span>
          {stats.countryBreakdown.map((c) => (
            <div key={c.code} style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
              <span style={{ width: 30, font: "var(--label-sm)", fontSize: 10, letterSpacing: ".06em" }}>{c.code.toUpperCase()}</span>
              <span aria-hidden="true" style={{ flex: 1, height: 7, background: "rgba(246,240,222,.2)" }}>
                <span style={{ display: "block", height: "100%", width: `${c.percent}%`, background: "var(--yellow)" }} />
              </span>
              <span style={{ width: 34, textAlign: "right", font: "var(--numeral)", fontSize: 11 }}>{c.percent}%</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
