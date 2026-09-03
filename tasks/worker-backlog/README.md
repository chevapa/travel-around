# Worker backlog

Each file in this folder is a **ready-to-dispatch context packet** for the local
Ollama worker (`qwen3.5:9b`), written per
`~/.claude/skills/local-ollama-worker/references/context-packet.md`. All the
architecture/judgment calls (function signatures, thresholds, file layout,
test framework choice) are already made — dispatching one of these should be
"paste into `ask_ollama.py`, apply, verify," nothing left to decide.

## How to run one

```bash
python3 ~/.claude/skills/local-ollama-worker/scripts/ask_ollama.py qwen3.5:9b false tasks/worker-backlog/<file>.md
```

`think:false` unless a file says otherwise. Each is sized to be a single
dispatch — none should need `think:true` or run past ~2 minutes; if one does,
that's a signal to split it further (see `references/budgets.md`), not to
wait it out.

## Order

Files are numbered by suggested order, not strict dependency, except:
**01a → 01b → 01c** must run in that order (each file's code depends on the
previous one's output). **01b is written to not break if 01c hasn't run yet**
(new `userPos` param defaults to `null`), so 03b's tests are safe to write
before or after 01b lands.

| file | touches | depends on |
|---|---|---|
| `01a-distance-context-fn.md` | `js/context.js` | — |
| `01b-distance-scoring.md` | `js/recommendationEngine.js` | 01a |
| `01c-distance-wiring.md` | `js/recommend.js` | 01a, 01b |
| `02-vocab-validator-script.md` | new `scripts/validate-vocab.mjs` | — |
| `03a-test-profile.md` | new `tests/profile.test.mjs` | — |
| `03b-test-recommendation-engine.md` | new `tests/recommendationEngine.test.mjs` | — |
| `03c-test-places-id.md` | new `tests/places-id.test.mjs` | — |
| `04-onboarding-picker.md` | new function in `js/places.js` | — |

After dispatching and applying any of these, run the VERIFICATION section in
that file yourself before trusting the result — see
`references/verification.md`.
