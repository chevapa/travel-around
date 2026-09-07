# Travel Around — Product & Design Brief

> Repo context: the current implementation (`index.html`, `styles.css`, `places/`) is a
> simpler static map site — see `README.md` for how that works today. This brief is the
> target product vision that future work in this repo should move toward.

## 0. Engineering Rule — Prefer the Local LLM When It Fits

**RULE 1:** Before doing a task via the paid API directly, check whether it could be
performed by the local LLM (Ollama, on this machine) instead — and if so, do it locally.
For every task actually done via the paid API, judge afterward whether it potentially
could have been performed locally instead, so tasks that should have been delegated don't
just silently go unnoticed.

**Enforcement — this is the part that actually failed in practice, addendum 2026-09-05:**
"judge afterward" turned out to only happen when the user explicitly asked for an
accounting, not as a standing habit — a real session produced 5 skipped attempts (commit
messages, PR descriptions) before anyone checked. Two concrete fixes, not just a
restated intention:

1. **Before writing a commit message or PR description yourself, run the matching script
   first** (`suggest_commit_msg.py` / `suggest_pr_description.py`) — even if draft text
   already exists from earlier in the task (e.g. you already wrote a commit message and
   are about to reuse it as a PR body). "I already have the text" is not a reason to skip
   the attempt; the script reads the actual diff independently and may produce a better
   or different draft. Fall back to the existing text only if the script fails.
2. **When reporting finished work back to the user, state which local script was tried for
   each commit-message/PR-description/classification-shaped subtask, and why not if it
   wasn't** — make the retrospective judgment part of the default report format, not a
   diagnostic that only runs when asked.
3. **A tool that didn't exist yet is not a standing excuse once it does — addendum
   2026-09-07:** caught in a real same-session self-audit: `suggest_issue_comment.py` was
   built mid-session (issue #113) specifically because ~10 issue-closing comments earlier
   in that same session had been hand-typed with no script to try. It was then used once,
   for the issue that motivated building it — and the next 4 issue-closing comments
   *in the same session* (#114, #117, #118, #119) went back to being hand-typed, this time
   with the script sitting right there unused. Retroactively running it against one of
   those (#118) produced a comment of comparable quality to what was actually posted,
   confirming the skip wasn't because the tool didn't work — the habit just didn't update
   when the tool's availability changed mid-task. Fix: when a script that unblocks a
   commit-message/PR-description/issue-comment/classification-shaped task is added or
   discovered *during* a session, that changes the default for every *remaining*
   same-shaped subtask in that session, not just the one that prompted building it —
   treat "does a script exist for this shape now" as a question to re-ask each time,
   not a fact settled once at the start of the session.

This only pays off when the task is the right *shape* — see
`~/.claude/skills/local-ollama-worker/EXPERIMENT-LOG.md` for the full experimental record
(measured, not assumed) of what works and what doesn't on this hardware:

- **Good fit:** a single, small-context, single-shot call with a short fail-fast timeout —
  commit messages, PR descriptions, issue triage, tag/label suggestions against a fixed
  enum, data summarization from pre-aggregated stats. Verification is cheap: skim one
  paragraph, or check the output against a fixed set of valid values.
- **Bad fit:** multi-file code generation with retries across a spec→code→check pipeline.
  Tested repeatedly (three separate attempts, logged) and abandoned: the spec/token cost
  regularly exceeded just writing the code directly, and separately, this machine's
  available memory is unpredictable enough that a single such call has stalled for 4+
  hours with zero output and no working timeout backstop. Don't re-litigate this without
  new evidence.

### Where to see which tasks are possible via the local LLM right now

- `~/.claude/skills/local-ollama-worker/scripts/` — the actual runnable tools:
  - `suggest_commit_msg.py` — commit message from a diff
  - `suggest_pr_description.py` — PR title+body from a branch's log/diff
  - `triage_issue.py` — classify a GitHub issue into ui-judgment / data-decision /
    mechanical / non-code (~60-70% agreement with manual triage — a triage aid, not an
    oracle; skim its output, don't just consume it)
  - `suggest_place_tags.py` — suggest `data/vocab.json` category tags per place, validated
    against the real vocab (never edits a place file itself)
  - `summarize_places.py` — "travel taste" overview generated from deterministically
    aggregated place stats
  - `route_command.py` — classify free text into a small fixed command set, then run the
    matching pre-approved command
  - `agent_pipeline.py` — multi-file spec→code→check pipeline. **Bad fit** (see above) —
    kept only for reference / possible future re-testing, not for routine use.
- `~/.claude/skills/local-ollama-worker/EXPERIMENT-LOG.md` — the full record of every
  attempt, including what failed and why, and measured accuracy/timing numbers for what
  currently works.

## 1. Project Essence

Travel Around is a personal travel guide that helps answer a simple question:
**"Where should I go next?"**

It's not an ordinary map of places or a catalog of sights. The app gradually builds a
personal travel history for the user: where they've already been, what they liked, what
they didn't like, where they'd like to go back to, which places they haven't visited yet,
and what kinds of trips they enjoy.

Based on this history, the current context, and external conditions, the app suggests the
next place worth visiting.

**Core loop:** Visited → got an impression → rated it → the system learned more → got new
context → suggested the next place.

This way, the app becomes more personal over time.

## 2. Core User Scenario

The user opens the app not to search for a place for a long time. They open it with a
question: **"Where should I go?"**

The app immediately shows a single, best-fitting recommendation.

For example:

> Where to today?
> **Žumberak**
> Looks like this is the place for you.

Below it are a few short reasons why this particular place fits right now:

- ☀️ good weather
- 🚗 suitable distance
- 🗺 the user hasn't been here yet
- ❤️ the user has already liked similar places
- 🍂 the right season
- 🕐 fits the user's current free time / trip format

**Main idea:** Don't make the user search for the answer among dozens of places. Give them
one concrete next option.

## 3. First Screen — Recommendations / Swipes

This is the app's main screen. It's built around a single recommendation and a swipe
mechanic.

The user sees a large visual card for a place, styled as a fragment of a personal travel
scrapbook / risograph collage. The card shouldn't feel like a standard UI card — it should
feel like a new fragment of the user's story that the app is proposing to add to their
collection of experiences.

**Main information on the card:**

- place name
- photo / visual material
- place type
- weather / current conditions
- distance or travel time
- seasonality
- a few personalized reasons for the recommendation

No need to show all the information stored in the database. The card should only answer
two questions: **Where?** and **Why this place specifically?**

## 4. Swipe Mechanics

The user quickly makes a decision about the suggested place. There are three main actions:

**❤️ Let's go!**
The user is interested in the place. This is a strong positive signal. The place can move
into a wishlist / selected-places list and be used in further recommendations.

**↓ Save for later**
The place is potentially interesting, but right now the user doesn't want to make a
decision. This is not negative feedback. The place goes into a kind of archive / "for
later" list and can be suggested again at a more suitable moment. This should visually
feel like: "Not now, but don't forget about it."

**✕ Not interested**
The user isn't interested in the place. It's removed from the current recommendation flow.
This is a negative signal for the system, but doesn't necessarily mean the user will never
want to visit this place.

## 5. Why Swipes Matter

A swipe isn't just a way to make the interface look like a dating app. It's a very fast way
to continuously collect information about the user's preferences.

Every decision adds a new signal: this is interesting; this isn't interesting; this is
interesting, but later.

Over time, the app starts to understand the user better. That said, the most valuable
signal remains real experience after visiting a place.

So the rough hierarchy of signals is:

**real experience → explicit feedback → reaction to a recommendation → indirectly inferred
preferences.**

## 6. Second Screen — Map

The second main screen is the map.

If the first screen answers: "Where should I go?" then the map answers: **"What do I
actually have around me?"**

The map shows the user's places and their states. For example:

- already visited
- not yet visited
- saved for later
- places the user wants to visit again

The map lets you move from a specific recommendation to the full picture of a personal
travel history.

On the map you can:

- move around the area
- look at places
- use filters
- open a specific place's card
- view details and history

## 7. Connection Between the Two Screens

These two screens shouldn't feel like two independent sections. They are two ways of
looking at the same system.

```
Recommendations "Where next?"
        ↓
Map "What do I already have?"
        ↓
Selecting a place on the map
        ↓
place details
        ↓
visit
        ↓
feedback
        ↓
updated travel history
        ↓
new recommendation
```

The transition between Recommendations and Map should be obvious and fast. For example,
next to the recommendation on the main screen there could be an action: **View on map →**

And on the map, the user can open a specific place and go back to the recommendations.

## 8. Initial State / New User

The app needs to work even when the user doesn't have any history yet. In that case, the
system can't rely on personal data right away.

So initially, a short "get to know your preferences" mechanic can be used: place →
reaction → next place → reaction → next place.

The user quickly shows:

- what interests them
- what kinds of places they like
- what trip formats suit them
- what they're completely uninterested in

Once the first real visits happen, recommendations start being based not only on initial
preferences but also on the user's own experience.

## 9. Recommendation Context

A recommendation shouldn't only take static preferences into account. Current context
matters. Depending on available data, this can include:

- current location
- distance
- weather
- season
- day of week
- available time
- mode of transport
- visit history
- previous ratings
- similar places
- saved places
- desire to go back

**Main principle:** A recommendation should be explained by context. Not just: "Žumberak."
But: "Žumberak — because…"

## 10. Visual Concept

The visual concept is based on a bold risograph / editorial collage aesthetic. This isn't
just a decorative style — the visual language is a metaphor for the idea of the project
itself.

Life is made of fragments:

- photos
- trips
- memories
- tickets
- notes
- newspaper clippings
- random impressions
- places we've visited
- places we're still planning to go

So the interface should look like a personal mosaic made of collected fragments.

**Main visual elements:**

- torn paper
- newspaper and magazine fragments
- collages
- halftone / risograph texture
- imperfect printing
- overlapping layers
- stamps
- handwritten or editorial elements
- large typography
- bright spots of color
- a limited but saturated color palette
- the feel of a physical printed object

**Important:** this should be a bold, energetic risograph aesthetic — not a muted vintage
scrapbook.

## 11. Core Metaphor

Every place is a potential new fragment of the user's life. Already-visited places are
existing fragments. Feedback is information about which fragments the user liked. Saved
places are fragments set aside for now. A new recommendation is the next fragment that
could be added to the story.

So the app is constantly answering the question: **"What will the next fragment be?"**

## 12. What Should Be Included

**On the first screen:**

- one main recommendation
- place name
- a strong visual image
- a short explanation of "why"
- current context
- three clear actions
- ability to go to the map

**On the second screen:**

- map
- all saved places
- clear statuses
- filtering
- ability to open a specific place
- connection to visit history

**In the system:**

- accumulating history
- feedback
- personalization
- recommendation context
- ability to save places for later
- ability to return to places the user liked

## 13. What Should NOT Be Included

Above all — don't turn the first screen into a dashboard. Don't immediately show:

- a huge list of places
- dozens of filters
- complex statistics
- tables
- lots of fields
- coordinates
- technical data
- long descriptions
- complex preference settings

The user came with one question: "Where should I go?" The answer should be clear almost
immediately.

There shouldn't be a feeling of: *"I opened a database of my travels."*
There should be a feeling of: *"I opened the app, and it already figured out where I
should go."*

## 14. Core Product Principle

**The product should reduce the decision, not increase the search.**

Don't show the user 50 options and make them choose. The system should just say: *Here you
go.* And the user simply decides: *Let's go / later / not interested.*

And every such decision makes the next recommendation a little more personal.

## 15. Minimal App Structure

**Screen 01 — Recommendation**
Where should I go? → place → why → context → swipe

**Screen 02 — Map**
What places do I have? → map → places → statuses → filters → details

**Future:** Visit → Experience → Feedback → Better recommendation

This exact loop is the core of Travel Around.
