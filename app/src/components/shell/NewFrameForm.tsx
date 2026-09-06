import { useState, type HTMLAttributes } from "react";
import { Button } from "../core/Button";
import { IconButton } from "../core/IconButton";
import { TapeStrip } from "../core/Paper";
import { Tag } from "../core/Tag";

/**
 * The New Frame flow (Task 10, DESIGN_RISO1/IMPLEMENTATION_PLAN.md) — a
 * stub in the reference UI kit, deliberately unbuilt until the plan's own
 * questions were answered (issue #95, epic #84):
 *
 *   - starts from a map long-press (not a search result or a pasted link)
 *   - only name + location are required — everything else (description,
 *     drive time, tags) can be filled in later
 *   - no photo required at creation; a frame only becomes a print once a
 *     photo is attached, when it's actually visited (matches the
 *     lexicon: "print" and "photo" go together)
 *
 * Built entirely from existing primitives, per the plan's own instruction
 * — same visual shape as FrameCard (name first, tape strip, dashed
 * unprinted placeholder), since a brand-new frame IS an unprinted frame.
 * Docks in the panel slot like FrameCard and IndexPanel do.
 */
export interface NewFrameFormProps extends HTMLAttributes<HTMLDivElement> {
  lat: number;
  lon: number;
  onSave: (input: { name: string; lat: number; lon: number }) => void;
  onCancel: () => void;
}

function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

export function NewFrameForm({ lat, lon, onSave, onCancel, style, ...rest }: NewFrameFormProps) {
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const canSave = trimmed.length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({ name: trimmed, lat, lon });
  };

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
      <div style={{ padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 11, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0, font: "var(--display-3)", letterSpacing: "var(--display-tracking-tight)", textTransform: "uppercase" }}>
            New Frame
          </h3>
          <IconButton glyph="✕" label="Cancel" size={26} onClick={onCancel} style={{ border: "none", background: "transparent", minWidth: 26, minHeight: 26 }} />
        </div>
        <div style={{ height: 5, background: "var(--pink)", width: 88, flex: "0 0 auto" }} />

        {/* Every new frame starts unprinted — this is the same placeholder FrameCard shows for state="unprinted", not a new visual. */}
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
            not visited yet
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--label-sm)", letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-quiet)" }}>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            placeholder="Name this place"
            autoFocus
            style={{
              font: "var(--body)",
              padding: "10px 11px",
              border: "var(--stroke)",
              borderRadius: "var(--radius)",
              background: "var(--paper-1)",
              color: "var(--ink)",
            }}
          />
        </label>

        <div style={{ display: "flex", flex: "0 0 auto" }}>
          <Tag tone="ink">{formatCoords(lat, lon)}</Tag>
        </div>
      </div>
      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 8, flex: "0 0 auto" }}>
        <Button variant="accent" disabled={!canSave} onClick={save} style={{ width: "100%" }}>
          Add Frame
        </Button>
      </div>
    </div>
  );
}
