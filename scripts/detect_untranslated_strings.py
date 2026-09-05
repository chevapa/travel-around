#!/usr/bin/env python3
"""issue #61: detect Latin-alphabet strings that may have leaked untranslated
into this Russian-language UI (<html lang="ru">).

Two-step design, per the issue's own split:
1. Deterministic regex scan (this step, always runs, no LLM) over
   index.html's user-facing text nodes + a fixed set of user-facing
   attributes (alt/aria-label/placeholder/title/data-*, never class/id/
   href/src), and over string literals in js/*.js that contain a space
   (multi-word phrases are far more likely to be real UI prose than a
   single technical token like a CSS class name or variable).
2. One local Ollama call PER hit, classifying it as an intentional brand
   name/technical term vs. an accidental untranslated leak — same
   fail-soft, one-call-per-item contract as triage_issue.py. Skipped
   automatically (falls back to "unclassified — ollama unavailable") if
   Ollama isn't reachable, so step 1's scan is still useful standalone.

Output is a report for a human to read, never an auto-edit — per #61's
explicit scope.

Known limitation, measured not assumed (see EXPERIMENT-LOG.md v11): the
deterministic scan is reliable, but the LLM classification step tested
poorly against this repo's real candidates (21/22 labeled "leak" including
two already-established intentional brand strings, with inconsistent
verdicts on near-identical CSS values) — treat its intentional/leak
verdicts with real skepticism, or pass --no-llm and judge the filtered
candidate list by hand, which is what actually resolved #61.

Usage:
    python3 scripts/detect_untranslated_strings.py [--repo-root .] [--no-llm]
"""
import argparse
import json
import math
import re
import signal
import sys
import urllib.error
import urllib.request
from pathlib import Path

OLLAMA_URL = "http://localhost:11434/api/generate"
MAX_CONTEXT_TOKENS = 512
OUTPUT_RESERVE = 16
CHARS_PER_TOKEN = 4

LATIN_WORD_RE = re.compile(r'[A-Za-z]{2,}')
# Only genuinely user-facing attributes — deliberately excludes the many
# data-* attributes this codebase uses as technical routing keys (e.g.
# data-screen="recommend", data-panel="panel-status") rather than display
# text, per the issue's own "not class/id" instruction extended to the
# equally-technical data-* attributes actually in use here.
ATTR_RE = re.compile(r'\b(?:alt|aria-label|placeholder|title)\s*=\s*"([^"]*)"')
TAG_STRIP_RE = re.compile(r'<[^>]+>')
SCRIPT_STYLE_RE = re.compile(r'<(script|style)\b.*?</\1>', re.DOTALL | re.IGNORECASE)
# Backtick template literals only — NOT a generic '/"/`` string matcher.
# A first version matched any quote character and was overwhelmed by
# apostrophes inside Russian comments ("isn't", "doesn't") being misread as
# string delimiters, splitting whole comment blocks into garbage "strings".
# Backticks are unambiguous in this codebase (no escaped/nested backticks
# in practice) and are where virtually all real UI markup/text actually
# lives (this app builds every dynamic bit of DOM via template literals).
JS_TEMPLATE_RE = re.compile(r'`([^`]*)`', re.DOTALL)
INTERPOLATION_RE = re.compile(r'\$\{[^}]*\}')
# CSS function calls (transform/color values) left over once interpolated
# numbers are blanked out by INTERPOLATION_RE above — e.g.
# "translateY( px) scale( )" — not prose in any language, not worth a call.
CSS_FUNCTION_RE = re.compile(
    r'^[\s,]*(?:translate[XY]?|scale|rotate|rgba?|url)\s*\([^)]*\)[\s,]*$',
    re.IGNORECASE,
)


def load_text(path):
    try:
        return path.read_text(encoding='utf-8')
    except OSError:
        return ''


def scan_html(path):
    html = load_text(path)
    html_no_scripts = SCRIPT_STYLE_RE.sub('', html)
    hits = []
    for m in ATTR_RE.finditer(html):
        val = m.group(1).strip()
        if val and LATIN_WORD_RE.search(val):
            hits.append((str(path), 'attribute', val))
    for segment in TAG_STRIP_RE.split(html_no_scripts):
        seg = segment.strip()
        if seg and LATIN_WORD_RE.search(seg) and len(seg) > 1:
            hits.append((str(path), 'text-node', seg))
    return hits


def scan_js(path):
    js = load_text(path)
    hits = []
    for m in JS_TEMPLATE_RE.finditer(js):
        template = m.group(1)
        no_interp = INTERPOLATION_RE.sub(' ', template)
        no_tags = TAG_STRIP_RE.sub('|', no_interp)
        for segment in no_tags.split('|'):
            seg = segment.strip()
            # Attribute-only fragments (class="...", data-x="...") are HTML
            # syntax leaking through the tag split, not text content —
            # anything that's only attribute-shaped key="value" pairs and
            # punctuation gets dropped the same way index.html's own
            # class/id attributes are excluded from ATTR_RE above.
            if not seg or '=' in seg or not LATIN_WORD_RE.search(seg):
                continue
            if CSS_FUNCTION_RE.match(seg):
                continue
            words = LATIN_WORD_RE.findall(seg)
            # A single short Latin token (a URL path fragment, a css-var-ish
            # id fragment like "dt-", a lone English word used as an
            # identifier) is far more often code than prose — require
            # either 2+ Latin words, or one real word of meaningful length,
            # to actually be worth a classification call.
            if len(words) < 2 and not (words and len(words[0]) >= 5):
                continue
            hits.append((str(path), 'js-template', seg))
    return hits


def estimate_tokens(text):
    return math.ceil(len(text) / CHARS_PER_TOKEN)


class TimedOut(Exception):
    pass


def _alarm_handler(signum, frame):
    raise TimedOut()


def classify(text, model, timeout):
    system = (
        "This string appears in the UI of a fully-Russian-language travel "
        "app (<html lang=\"ru\">). Decide if it is INTENTIONAL (a brand "
        "name, a proper noun, a CSS/technical term, an emoji-adjacent "
        "decorative word) or a LEAK (an untranslated English phrase that "
        "should have been in Russian). Output ONLY one word: intentional "
        "or leak."
    )
    prompt = f"{system}\n\nSTRING: {text}"
    required = estimate_tokens(prompt) + OUTPUT_RESERVE
    if required > MAX_CONTEXT_TOKENS:
        return 'unclassified'
    num_ctx = min(MAX_CONTEXT_TOKENS, int(math.ceil(required / 128)) * 128)
    payload = json.dumps({
        "model": model, "prompt": prompt, "think": False, "stream": False,
        "options": {"num_ctx": num_ctx, "temperature": 0, "seed": 42},
    }).encode('utf-8')
    req = urllib.request.Request(OLLAMA_URL, data=payload, headers={"Content-Type": "application/json"})
    signal.signal(signal.SIGALRM, _alarm_handler)
    signal.alarm(timeout + 5)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.load(resp)
    except (urllib.error.URLError, TimeoutError, OSError, TimedOut):
        return 'unclassified'
    finally:
        signal.alarm(0)
    raw = data.get('response', '').strip().lower().strip('.\"\'')
    return raw if raw in ('intentional', 'leak') else 'unclassified'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--repo-root', default='.')
    ap.add_argument('--model', default='qwen3.5:9b')
    ap.add_argument('--timeout', type=int, default=300)
    ap.add_argument('--no-llm', action='store_true', help='skip the classification step, just print the deterministic scan')
    args = ap.parse_args()
    root = Path(args.repo_root)

    hits = []
    hits += scan_html(root / 'index.html')
    hits += scan_html(root / '404.html')
    for js_file in sorted((root / 'js').glob('*.js')):
        hits += scan_js(js_file)

    if not hits:
        print("No candidate Latin-script strings found.")
        return

    # De-dupe identical strings seen more than once (e.g. the same phrase in
    # two files) — one classification call is enough per distinct string.
    seen = {}
    for path, kind, text in hits:
        seen.setdefault(text, []).append((path, kind))

    for text, locations in seen.items():
        verdict = 'unclassified (--no-llm)' if args.no_llm else classify(text, args.model, args.timeout)
        loc_str = '; '.join(f'{p}:{k}' for p, k in locations)
        print(f"{verdict}\t{text!r}\t[{loc_str}]")


if __name__ == '__main__':
    main()
