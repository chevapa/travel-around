#!/usr/bin/env node
// Task 12 acceptance check: "a grep for emoji across src/ returns nothing"
// (DESIGN_RISO1/IMPLEMENTATION_PLAN.md). RISO1 has no icon set — it uses
// seven approved Unicode glyphs set in Space Mono instead (readme.md,
// "ICONOGRAPHY"): ⌕ ✕ ★ ↗ → ◠ and the unprinted "?". Those live in the
// same Unicode blocks common emoji do, so this excludes exactly those
// seven characters rather than the whole block — anything else in an
// emoji-ish range is a real find.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const target = join(root, "src");

const APPROVED_GLYPHS = new Set(["⌕", "✕", "★", "↗", "→", "◠", "?"]);

// Emoji live in these general ranges (plus the dingbats/misc-symbols
// blocks the seven approved glyphs also happen to live in).
const EMOJI_ISH = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu;

function walk(dir) {
  let files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files = files.concat(walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry)) files.push(full);
  }
  return files;
}

const offenders = [];
for (const file of walk(target)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const matches = line.match(EMOJI_ISH);
    if (!matches) return;
    const unapproved = matches.filter((ch) => !APPROVED_GLYPHS.has(ch));
    if (unapproved.length > 0) {
      offenders.push({ file: relative(root, file), line: i + 1, chars: unapproved, text: line.trim() });
    }
  });
}

if (offenders.length > 0) {
  console.error("Found emoji (or an unapproved glyph) in src/ — RISO1 uses only ⌕ ✕ ★ ↗ → ◠ ? :\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.chars.join(", ")}\n    ${o.text}`);
  }
  process.exit(1);
}

console.log("No emoji found in src/ — only the seven approved chrome glyphs are present.");
