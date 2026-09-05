import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// issue #61: regression test for the exact bug the first version of this
// scanner's JS-string matching had — apostrophes inside Russian comments
// ("isn't", "doesn't") being misread as opening a string literal, which
// swallowed whole comment blocks as garbage "hits". Run via a small Python
// subprocess against the script's own scan_js(), same cross-language
// pattern as tests/check-pr-issue-closure.test.mjs.
function scanJs(source) {
  const out = execFileSync('python3', ['-c', `
import sys, json, tempfile, os
sys.path.insert(0, 'scripts')
from detect_untranslated_strings import scan_js
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write(sys.argv[1])
    path = f.name
try:
    hits = scan_js(__import__('pathlib').Path(path))
finally:
    os.unlink(path)
print(json.dumps([h[2] for h in hits]))
`, source], { encoding: 'utf-8' });
  return JSON.parse(out);
}

test('apostrophes inside comments do not get misread as string delimiters', () => {
  const source = `
// this doesn't happen and isn't a real string, just a Russian-style comment
const x = 1;
`;
  assert.deepEqual(scanJs(source), []);
});

test('a real backtick template literal with English prose is still found', () => {
  const source = "const html = `<p>Some English Prose Here</p>`;";
  const hits = scanJs(source);
  assert.ok(hits.some(h => h.includes('Some English Prose Here')), `expected a hit, got ${JSON.stringify(hits)}`);
});

test('template literals with only interpolation/tags produce no false hit', () => {
  const source = "const html = `<span>${place.name}</span>`;";
  assert.deepEqual(scanJs(source), []);
});
