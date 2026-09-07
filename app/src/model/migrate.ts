/**
 * Migrates a places/*.json record (the current live site's shape) into a
 * Frame. Pure — no I/O — so it's unit-testable and reusable from the CLI
 * script (scripts/migrate-places.ts) that writes src/data/frames.json.
 *
 * See DESIGN_RISO1/IMPLEMENTATION_PLAN.md Task 2, issue #87:
 * "visited && liked → 'loved', visited && !liked → 'fine', !visited →
 * 'unprinted'". The live dataset already stores exactly this as a single
 * `cat: 'loved' | 'ok' | 'plan'` field (not a boolean pair), so the mapping
 * is a rename, not a derivation.
 */
import type { Frame, FrameState } from "./frame";

export interface RawPlace {
  id: string;
  name: string;
  q?: string;
  lat: number;
  lng: number;
  cat?: string;
  cats?: string[];
  country?: string;
  season?: string;
  drive?: string;
  note?: string;
  warn?: string;
  wantReturn?: boolean;
  src?: string;
  source?: string;
}

export interface MigrationResult {
  frame: Frame;
  issues: string[];
}

/** Zagreb — the home point every drive-time and distance figure is relative to. Matches js/map.js BASE_POINTS.zagreb and js/context.js FALLBACK_COORDS in the live site. */
export const HOME = { lat: 45.815, lon: 15.9819 };

/** Assumed average day-trip driving speed, for the ~30% of records with no `drive` text to estimate a minutes figure from distance. Not measured — flagged wherever it's used. */
const ASSUMED_AVG_SPEED_KMH = 55;

const CAT_TO_STATE: Record<string, FrameState> = {
  loved: "loved",
  ok: "fine",
  plan: "unprinted",
};

export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Parses Russian drive-time text ("1 ч 20 мин", "50 мин", "1 ч") into minutes. Returns null if the text doesn't match either unit. */
export function parseDriveMinutes(text: string): number | null {
  const hoursMatch = text.match(/(\d+)\s*ч/);
  const minsMatch = text.match(/(\d+)\s*мин/);
  if (!hoursMatch && !minsMatch) return null;
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const mins = minsMatch ? Number(minsMatch[1]) : 0;
  return hours * 60 + mins;
}

export function migratePlace(raw: RawPlace): MigrationResult {
  const issues: string[] = [];

  let state: FrameState;
  if (raw.cat && CAT_TO_STATE[raw.cat]) {
    state = CAT_TO_STATE[raw.cat];
  } else {
    state = "unprinted"; // matches places/README.md: cat defaults to "plan" when absent
    if (raw.cat) {
      issues.push(`unrecognized cat "${raw.cat}" — defaulted to unprinted`);
    }
  }

  const distanceKm = haversineKm(HOME, { lat: raw.lat, lon: raw.lng });

  let driveMinutes: number;
  if (raw.drive) {
    const parsed = parseDriveMinutes(raw.drive);
    if (parsed !== null) {
      driveMinutes = parsed;
    } else {
      driveMinutes = Math.round((distanceKm / ASSUMED_AVG_SPEED_KMH) * 60);
      issues.push(`could not parse drive text "${raw.drive}" — estimated ${driveMinutes} min from distance at ${ASSUMED_AVG_SPEED_KMH} km/h`);
    }
  } else {
    driveMinutes = Math.round((distanceKm / ASSUMED_AVG_SPEED_KMH) * 60);
    issues.push(`no drive field — estimated ${driveMinutes} min from distance at ${ASSUMED_AVG_SPEED_KMH} km/h`);
  }

  const frame: Frame = {
    id: raw.id,
    name: raw.name,
    state,
    lat: raw.lat,
    lon: raw.lng,
    driveMinutes,
    distanceKm: Math.round(distanceKm * 10) / 10,
    tags: raw.cats ?? [],
    description: raw.note,
    source: raw.source,
    // Issue 143: mirrors js/places.js's `sourceKey()` — explicit "journal"
    // wins, everything else (including no `src` at all) defaults to
    // "research", same as the live site. `custom` (the live site's other
    // journal signal, set when a place is added via the running map
    // rather than shipped in places/*.json) has no equivalent in this
    // static migration; RISO1's own New Frame flow is a separate,
    // session-only path (AtlasScreen's `saveNewFrame`), not migrated data.
    sourceType: raw.src === "journal" ? "journal" : "research",
    country: raw.country,
    season: raw.season,
    q: raw.q,
    warn: raw.warn,
    wantReturn: raw.wantReturn,
  };

  return { frame, issues };
}
