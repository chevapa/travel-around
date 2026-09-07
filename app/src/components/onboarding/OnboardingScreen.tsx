import { useEffect, useMemo, useState } from "react";
import rawFrames from "../../data/frames.json";
import { Button } from "../core/Button";
import { GrainOverlay } from "../core/GrainOverlay";
import { CATEGORY_IMAGE, categoryImageFor } from "../../lib/categoryImages";
import { fetchWikipediaPhoto } from "../../lib/wikipediaPhoto";
import { formatDrive, type Frame } from "../../model/frame";
import { buildProfile, rankFrames } from "../../model/recommendation";

/**
 * Issue 59: "not needed for a returning user, but the first needs a
 * choice questionnaire... I wouldn't turn it into an AI recommender.
 * Better a selection mode with a few clear, understandable parameters...
 * this fits the interface philosophy well: not endless choosing, but
 * finally choosing." CLAUDE.md §8's "get to know your preferences"
 * mechanic, scoped to exactly the two parameters this app's real data
 * can actually answer honestly:
 *
 * - **How far** — every frame has a real `driveMinutes`.
 * - **What kind of place** — every frame's `tags` use the same fixed
 *   category vocabulary `lib/categoryImages.ts` already illustrates.
 *
 * Deliberately drops two parameters from the reporter's own sketch:
 * "how much time" (would need `Frame.stayMinutes`, which is unset on
 * every single frame in the current dataset — nothing to filter by) and
 * weather (needs a live API + geolocation flow, the same scope boundary
 * issue 141's recommendation engine already drew). Real parameters that
 * actually narrow the result, not decorative ones that always no-op.
 *
 * The pick itself reuses issue 141's scoring engine (`rankFrames`) rather
 * than a coin flip — "not an AI recommender" in the reporter's sense
 * means no opaque model and no persisted profile, not "ignore the
 * transparent scoring that already exists." If the chosen mood has no
 * match within the chosen distance, the mood is dropped rather than
 * showing a dead end (issue 124's established precedent elsewhere in
 * this app: a filter is never allowed to be a trap with no way out).
 */
const defaultFrames = rawFrames as Frame[];

export interface OnboardingScreenProps {
  /** Defaults to the full migrated dataset; overridable for tests/stories. */
  frames?: Frame[];
  /** Fired with the chosen frame's id once the user commits with "Let's go →". */
  onLetsGo: (frameId: string) => void;
  /** "Not now" — skips straight past onboarding. */
  onSkip: () => void;
}

const DISTANCE_OPTIONS = [
  { key: "near", label: "Up to 1h", maxMinutes: 60 },
  { key: "mid", label: "1–2h", maxMinutes: 120 },
  { key: "far", label: "2h+", maxMinutes: Infinity },
] as const;

const MOOD_OPTIONS = ["Anything", ...Object.keys(CATEGORY_IMAGE)];

function useResultPhoto(frame: Frame | undefined) {
  const [wikiSrc, setWikiSrc] = useState<string | undefined>(undefined);
  const wikiQuery = frame && !frame.photo ? frame.q || frame.name : undefined;
  useEffect(() => {
    setWikiSrc(undefined);
    if (!wikiQuery) return;
    let cancelled = false;
    fetchWikipediaPhoto(wikiQuery).then((url) => {
      if (!cancelled) setWikiSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [wikiQuery]);
  if (!frame) return undefined;
  return frame.photo ?? wikiSrc ?? categoryImageFor(frame.tags);
}

export function OnboardingScreen({ frames = defaultFrames, onLetsGo, onSkip }: OnboardingScreenProps) {
  const [distanceKey, setDistanceKey] = useState<(typeof DISTANCE_OPTIONS)[number]["key"]>("mid");
  const [mood, setMood] = useState("Anything");
  const [revealed, setRevealed] = useState(false);

  const pick = useMemo(() => {
    const maxMinutes = DISTANCE_OPTIONS.find((d) => d.key === distanceKey)!.maxMinutes;
    const inRange = frames.filter((f) => f.state === "unprinted" && f.driveMinutes <= maxMinutes);
    const withMood = mood === "Anything" ? inRange : inRange.filter((f) => f.tags.includes(mood));
    // Never a dead end (issue 124's precedent): a mood with no match in
    // range just falls back to the wider distance-only pool.
    const candidates = withMood.length > 0 ? withMood : inRange;
    if (candidates.length === 0) return undefined;
    const profile = buildProfile(frames);
    return rankFrames(candidates, profile)[0];
  }, [frames, distanceKey, mood]);

  const photoSrc = useResultPhoto(pick?.frame);

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 16px 0", flex: "0 0 auto" }}>
        <Button variant="secondary" size="sm" onClick={onSkip}>
          Skip →
        </Button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "min(440px, 92vw)", display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ font: "var(--display-2)", fontSize: 26, textTransform: "uppercase", textAlign: "center" }}>Where to today?</span>

          {!revealed ? (
            <>
              <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <legend style={{ font: "var(--label-sm)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-40)", padding: 0, marginBottom: 4 }}>
                  How far?
                </legend>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DISTANCE_OPTIONS.map((d) => (
                    <Button key={d.key} variant={distanceKey === d.key ? "primary" : "secondary"} size="sm" onClick={() => setDistanceKey(d.key)}>
                      {d.label}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <fieldset style={{ border: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                <legend style={{ font: "var(--label-sm)", letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-40)", padding: 0, marginBottom: 4 }}>
                  What do you want?
                </legend>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {MOOD_OPTIONS.map((m) => (
                    <Button key={m} variant={mood === m ? "primary" : "secondary"} size="sm" onClick={() => setMood(m)}>
                      {m}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <Button variant="primary" onClick={() => setRevealed(true)} disabled={!pick}>
                Show place →
              </Button>
              {!pick ? <p style={{ margin: 0, font: "var(--body-sm)", color: "var(--ink-55)", textAlign: "center" }}>No unvisited places fit that yet — try a wider distance.</p> : null}
            </>
          ) : pick ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
              <span style={{ font: "var(--label-sm)", letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-40)" }}>Today</span>
              {photoSrc ? (
                <div style={{ padding: 5, background: "var(--paper-print)", boxShadow: "var(--lift-print)", width: "100%" }}>
                  <img src={photoSrc} alt={pick.frame.name} style={{ display: "block", width: "100%", height: 180, objectFit: "cover" }} />
                </div>
              ) : null}
              <h2 style={{ margin: 0, font: "var(--display-2)", textTransform: "uppercase" }}>{pick.frame.name}</h2>
              <p style={{ margin: 0, font: "var(--body-sm)", color: "var(--ink-55)" }}>Drive {formatDrive(pick.frame.driveMinutes)}</p>
              <Button variant="primary" onClick={() => onLetsGo(pick.frame.id)} style={{ width: "100%" }}>
                Let's go →
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <GrainOverlay />
    </div>
  );
}
