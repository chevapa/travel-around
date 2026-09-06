/**
 * The state union — the single semantic every screen reads from.
 * 'loved' | 'fine' | 'unprinted', never a boolean pair (RISO1 ground rule #5).
 * See DESIGN_RISO1/IMPLEMENTATION_PLAN.md Task 2, issue #87.
 */
export type FrameState = "loved" | "fine" | "unprinted";

/**
 * One place, in any state. The unit of the product (DESIGN_RISO1/readme.md,
 * "The lexicon"). Fields beyond the plan's base spec (country, season, q,
 * warn, wantReturn) are kept because the existing places/*.json dataset
 * carries them and the filter/search UI (Task 7, IndexPanel) needs them —
 * they are not part of RISO1's core print semantic.
 */
export interface Frame {
  id: string;
  name: string;
  state: FrameState;
  photo?: string; // required when state !== 'unprinted' — resolved at render time, not at migration time
  caption?: string; // handwriting; ≤ 4 words
  lat: number;
  lon: number;
  driveMinutes: number; // authoritative; format at render with formatDrive
  distanceKm: number;
  stayMinutes?: number;
  description?: string; // one clause what, one clause worth-it
  tags: string[]; // no emoji, ever
  source?: string;

  // Extensions beyond the plan's base Frame spec — real data this app's
  // filter UI needs, not part of RISO1's print semantic itself.
  country?: string;
  season?: string;
  q?: string; // local-language name, for the "search in Google" affordance
  warn?: string; // "check before you go" — reconstruction, hours, seasonality
  wantReturn?: boolean;
}

export function isPrinted(f: Frame): boolean {
  return f.state !== "unprinted";
}

/**
 * "52 min" below an hour, "1 h 04" at or above one — per
 * DESIGN_RISO1/IMPLEMENTATION_PLAN.md Task 2's examples exactly.
 */
export function formatDrive(mins: number): string {
  if (!Number.isFinite(mins) || mins < 0) {
    throw new Error(`formatDrive: invalid minutes value ${mins}`);
  }
  const rounded = Math.round(mins);
  if (rounded < 60) {
    return `${rounded} min`;
  }
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${hours} h ${String(remainder).padStart(2, "0")}`;
}

export interface StateCounts {
  loved: number;
  fine: number;
  unprinted: number;
}

export function countsByState(frames: Frame[]): StateCounts {
  const counts: StateCounts = { loved: 0, fine: 0, unprinted: 0 };
  for (const f of frames) {
    counts[f.state] += 1;
  }
  return counts;
}

/**
 * Every number is labelled (RISO1 content rule) — never a bare count.
 * "Zagreb · 42 printed / 74 not", matching the plan's example exactly:
 * printed = loved + fine, not = unprinted.
 */
export function formatMeta(location: string, counts: StateCounts): string {
  const printed = counts.loved + counts.fine;
  return `${location} · ${printed} printed / ${counts.unprinted} not`;
}
