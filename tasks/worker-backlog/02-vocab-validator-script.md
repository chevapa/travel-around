TASK
Write a new standalone Node script, `scripts/validate-vocab.mjs`, that checks
every place across `places/*.json` uses only enum values that actually exist
in `data/vocab.json`, and reports any that don't.

GOAL
Running `node scripts/validate-vocab.mjs` prints one line per bad value found
(file, place name or id, field, bad value) and exits with a non-zero code if
anything was found, or prints a single "all good" line and exits 0 if not.

EXISTING PATTERN TO IMITATE — scripts/assign-place-ids.mjs in full (same repo,
same conventions: plain Node ESM, no dependencies, reads places/*.json the
same way):

```js
#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../places/', import.meta.url).pathname;

const files = readdirSync(DIR).filter(f => f.endsWith('.json') && !f.startsWith('_'));

const usedIds = new Set();
let assigned = 0;

for(const file of files){
  const path = join(DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const items = Array.isArray(data) ? data : [data];

  items.forEach(p => {
    let candidate;
    do {
      candidate = Math.random().toString(36).slice(2, 10);
    } while (usedIds.has(candidate));
    usedIds.add(candidate);
    p.id = candidate;
    assigned++;
  });

  const reordered = items.map(({id, ...rest}) => ({id, ...rest}));
  const out = Array.isArray(data) ? reordered : reordered[0];
  writeFileSync(path, JSON.stringify(out, null, 2) + '\n');
}

console.log(`Готово: присвоено ${assigned} новых id.`);
```

RELEVANT DATA — shape of data/vocab.json (the enums to validate against):

```json
{
  "categories": { "town": {...}, "castle": {...}, "museum": {...}, "...": {} },
  "countries": { "hr": {...}, "si": {...}, "...": {} },
  "seasons": { "all": {...}, "warm": {...}, "summer": {...}, "stork": {...} },
  "statuses": { "loved": {...}, "ok": {...}, "plan": {...} }
}
```
(the top-level keys of each of these four objects — `categories`,
`countries`, `seasons`, `statuses` — ARE the valid enum values; e.g. valid
`country` values are exactly `Object.keys(vocab.countries)`.)

RELEVANT DATA — shape of one place object (already seen in places/*.json):
```json
{
  "id": "b7nmno2d",
  "name": "Кумровец (Старо Село)",
  "cat": "loved",
  "cats": ["town", "museum"],
  "country": "hr",
  "season": "all"
}
```

FIELD-TO-VOCAB MAPPING TO VALIDATE
- `place.cat` (single string) must be a key of `vocab.statuses` — OR be
  missing/empty (per places/README.md, missing `cat` defaults to "plan", it's
  not an error).
- `place.cats` (array of strings) — every entry must be a key of
  `vocab.categories`.
- `place.country` must be a key of `vocab.countries` — OR be missing/empty
  (per places/README.md, `country` is optional).
- `place.season` must be a key of `vocab.seasons` — OR be missing/empty
  (optional field).

CONSTRAINTS
- Same file-reading approach as the example: `readdirSync` over `places/`,
  filter `.json` files that don't start with `_`, `JSON.parse` each, handle
  both single-object and array-of-objects files.
- Load `data/vocab.json` once at the top via `readFileSync` + `JSON.parse`
  (path: `new URL('../data/vocab.json', import.meta.url).pathname`).
- This script only READS — do not call `writeFileSync` anywhere, do not
  modify any place file.
- For each bad value found, print one line to console in this format:
  `<file>: <place.id || place.name> — invalid <field> "<value>"`
- At the end: if any bad values were found, print a summary line
  `Found N problem(s).` and call `process.exit(1)`. If none were found, print
  `All places valid.` and exit normally (implicit 0).
- No npm dependencies, no imports beyond `node:fs` and `node:path`.

VERIFICATION
I will save this as scripts/validate-vocab.mjs and run
`node scripts/validate-vocab.mjs` myself, then check:
- It runs without throwing on the current, valid places/*.json data and
  prints "All places valid." with exit code 0.
- I'll hand-edit a scratch copy with a deliberately bad value (e.g.
  `"country": "zz"`) and confirm the script reports it correctly and exits
  with code 1, then discard that scratch edit.
- It does not modify any file under places/ (diff must be empty after
  running).

DO NOT
- Don't modify scripts/assign-place-ids.mjs or any places/*.json file.
- Don't add a package.json or any dependency.
- Don't validate fields not listed above (e.g. don't check `name`, `lat`,
  `lng`, `note` — those aren't enum-backed).

Your objective is not to finish the task. Your objective is to make the
smallest correct change supported by the available evidence.
