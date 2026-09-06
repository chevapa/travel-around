#!/usr/bin/env -S npx tsx
/**
 * Task 2 migration script (DESIGN_RISO1/IMPLEMENTATION_PLAN.md, issue #87).
 * Reads every places/*.json file at the repo root (skipping files whose
 * name starts with "_", exactly like the live site does — see
 * places/README.md), runs each record through migratePlace, and writes the
 * resulting Frame[] to src/data/frames.json.
 *
 * Every record that didn't map cleanly (no cat, unparseable/missing drive
 * time) is logged here rather than silently guessed at in silence.
 *
 * Run with: npm run migrate:frames
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migratePlace, type RawPlace } from "../src/model/migrate";
import type { Frame } from "../src/model/frame";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const PLACES_DIR = join(REPO_ROOT, "places");
const OUT_FILE = join(__dirname, "..", "src", "data", "frames.json");

function loadRawPlaces(): RawPlace[] {
  const files = readdirSync(PLACES_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const places: RawPlace[] = [];
  for (const file of files) {
    const contents = JSON.parse(readFileSync(join(PLACES_DIR, file), "utf8"));
    const list: RawPlace[] = Array.isArray(contents) ? contents : [contents];
    for (const p of list) places.push(p);
  }
  return places;
}

function main() {
  const raw = loadRawPlaces();
  const frames: Frame[] = [];
  const seenIds = new Set<string>();
  let issueCount = 0;

  for (const place of raw) {
    const { frame, issues } = migratePlace(place);
    if (seenIds.has(frame.id)) {
      console.warn(`[migrate] duplicate id "${frame.id}" (${frame.name}) — kept first occurrence, this one skipped`);
      continue;
    }
    seenIds.add(frame.id);
    for (const issue of issues) {
      console.warn(`[migrate] ${frame.id} (${frame.name}): ${issue}`);
      issueCount++;
    }
    frames.push(frame);
  }

  writeFileSync(OUT_FILE, JSON.stringify(frames, null, 2) + "\n");

  console.log(`\nMigrated ${frames.length} places → ${OUT_FILE}`);
  console.log(`${issueCount} record(s) had a logged issue (see warnings above).`);
  const byState = frames.reduce<Record<string, number>>((acc, f) => {
    acc[f.state] = (acc[f.state] ?? 0) + 1;
    return acc;
  }, {});
  console.log("By state:", byState);
}

main();
