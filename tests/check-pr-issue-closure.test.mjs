import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// issue #64: regression test for the exact bug this script exists to catch
// — GitHub only auto-closes the *first* issue number in a closing-keyword
// line ("Fixes #14, #15." closes #14 but leaves #15 open). Runs the
// script's own extraction function via a small Python subprocess rather
// than reimplementing the regex in JS — this repo already mixes Python
// (local-ollama-worker family, validate-vocab's siblings) and Node
// tooling, and re-deriving the same regex in a second language would be
// the thing more likely to drift out of sync with what actually ships.
function extract(text) {
  const out = execFileSync('python3', ['-c', `
import sys, json
sys.path.insert(0, 'scripts')
from check_pr_issue_closure import extract_cited_issues
print(json.dumps(sorted(extract_cited_issues(sys.argv[1]))))
`, text], { encoding: 'utf-8' });
  return JSON.parse(out);
}

test('multi-issue single-line citation extracts every number, not just the first', () => {
  assert.deepEqual(extract('Fixes #14, #15.'), [14, 15]);
});

test('one-per-line citations all extract', () => {
  assert.deepEqual(extract('Fixes #47\nFixes #48\nFixes #52\nFixes #53'), [47, 48, 52, 53]);
});

test('non-closing-keyword issue mentions are not counted as citations', () => {
  assert.deepEqual(extract('Resolves #1 and also relates to #2'), [1]);
});

test('no citations in plain text', () => {
  assert.deepEqual(extract('no issue refs here'), []);
});
