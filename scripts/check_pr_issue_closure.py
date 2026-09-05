#!/usr/bin/env python3
"""issue #64: verify every merged PR's cited issue(s) are actually closed.

Deterministic only, no LLM — GitHub only auto-closes the *first* issue
number in a closing-keyword line ("Fixes #14, #15." closes #14 but leaves
#15 open); this is a pure cross-reference (extract cited numbers, check
their state via `gh issue view`), and a model would only add hallucination
risk on top of a regex + API call, not value (see #64's own "out of
scope" note).

Usage:
    python3 scripts/check_pr_issue_closure.py [--limit 100]

Requires the `gh` CLI, authenticated against this repo (same as every
other script in this repo that shells out to it).
"""
import argparse
import json
import re
import subprocess
import sys

CLOSING_KEYWORDS = r'(?:fixes|fix|closes|close|resolves|resolve)'
# One match per "keyword: #N[, #N...]" run — handles both the single-line
# multi-issue form ("Fixes #47, #48") that caused the original bug, and
# separate lines ("Fixes #47\nFixes #48"), since each keyword occurrence
# starts its own match.
CITATION_RE = re.compile(
    CLOSING_KEYWORDS + r'\s+((?:#\d+(?:\s*,\s*(?:' + CLOSING_KEYWORDS + r'\s+)?)?)+)',
    re.IGNORECASE,
)
ISSUE_NUM_RE = re.compile(r'#(\d+)')


def gh_json(args):
    result = subprocess.run(['gh', *args], capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        print(f"gh {' '.join(args)} failed: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def extract_cited_issues(text):
    if not text:
        return set()
    cited = set()
    for m in CITATION_RE.finditer(text):
        for num in ISSUE_NUM_RE.findall(m.group(1)):
            cited.add(int(num))
    return cited


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--limit', type=int, default=100)
    args = ap.parse_args()

    prs = gh_json(['pr', 'list', '--state', 'merged', '--limit', str(args.limit),
                   '--json', 'number,title,body'])
    print(f"Checked {len(prs)} merged PRs.", file=sys.stderr)

    issue_state_cache = {}

    def issue_state(n):
        if n not in issue_state_cache:
            try:
                data = gh_json(['issue', 'view', str(n), '--json', 'state'])
                issue_state_cache[n] = data['state']
            except SystemExit:
                issue_state_cache[n] = 'UNKNOWN (gh issue view failed — deleted issue? PR number confused for issue?)'
        return issue_state_cache[n]

    mismatches = []
    for pr in prs:
        cited = extract_cited_issues(pr.get('title', '') + '\n' + (pr.get('body') or ''))
        for n in sorted(cited):
            state = issue_state(n)
            if state != 'CLOSED':
                mismatches.append((pr['number'], pr['title'], n, state))

    if not mismatches:
        print("No mismatches: every merged PR's cited issue(s) are closed.")
        sys.exit(0)

    print(f"\n{len(mismatches)} mismatch(es) found — PR merged but cited issue still open:\n")
    for pr_num, pr_title, issue_num, state in mismatches:
        print(f"  PR #{pr_num} ({pr_title!r}) cites issue #{issue_num}, but it is {state}")
    sys.exit(1)


if __name__ == '__main__':
    main()
