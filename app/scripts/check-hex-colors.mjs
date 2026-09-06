#!/usr/bin/env node
// Task 1 acceptance check: "a raw hex in a component is a bug" (RISO1 ground
// rule #2, DESIGN_RISO1/IMPLEMENTATION_PLAN.md). Every colour must come from
// tokens/*.css; this fails CI if src/components/** ever hardcodes one.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const target = join(root, "src", "components");
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir) {
  let files = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files; // src/components doesn't exist yet — nothing to check
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files = files.concat(walk(full));
    } else if (/\.(tsx?|jsx?|css)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const offenders = [];
for (const file of walk(target)) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    const matches = line.match(hexPattern);
    if (matches) {
      offenders.push({ file: relative(root, file), line: i + 1, matches, text: line.trim() });
    }
  });
}

if (offenders.length > 0) {
  console.error("Raw hex colours found in src/components/** — use a token from src/tokens/*.css instead:\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  ${o.matches.join(", ")}\n    ${o.text}`);
  }
  process.exit(1);
}

console.log("No raw hex colours in src/components/**.");
