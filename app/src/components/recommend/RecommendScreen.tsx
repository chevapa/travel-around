import { useEffect, useMemo, useState } from "react";
import rawFrames from "../../data/frames.json";
import { GrainOverlay } from "../core/GrainOverlay";
import { Button } from "../core/Button";
import { Tag } from "../core/Tag";
import { categoryImageFor } from "../../lib/categoryImages";
import { fetchWikipediaPhoto } from "../../lib/wikipediaPhoto";
import { formatDrive, type Frame } from "../../model/frame";
import { buildProfile, rankFrames, type Recommendation } from "../../model/recommendation";

const defaultFrames = rawFrames as Frame[];

/**
 * "Where should I go?" — issue 141, ported from the live site's swipe
 * screen (`js/recommend.js`, scored by `js/recommendationEngine.js`; see
 * `model/recommendation.ts`'s own docstring for what didn't come along
 * and why). Per CLAUDE.md §2-5, this is the app's primary entry
 * question, not the map — one card, one decision, not a list to search.
 *
 * Scope, deliberately smaller than the live site (per this issue's own
 * text: "treat it like the original epic's Task breakdown... rather than
 * a single PR"):
 * - The three actions are explicit buttons only. Drag-to-commit is real
 *   scope from the issue but a separate, substantial gesture-physics
 *   pass (velocity thresholds, rotation, multi-touch) — better done and
 *   tested on its own than rushed alongside the scoring engine and this
 *   screen's first version.
 * - No first-time-user onboarding pass. This app ships with one fixed,
 *   already-lived-in dataset (31 loved, 11 fine, 74 unprinted) — there's
 *   no "brand new user with zero history" state to trigger it against.
 *   Onboarding itself is issue #59's own open question, not decided here.
 * - Decisions (like/skip/save) are session-only state, same "no write
 *   API in this static site" scope as `AtlasScreen`'s `saveNewFrame`/
 *   want-to-go star — reset on reload, not persisted.
 */
export interface RecommendScreenProps {
  /** Defaults to the full migrated dataset; overridable for tests/stories. */
  frames?: Frame[];
  /** "View on map →" (CLAUDE.md §7) — switches to The Atlas. */
  onViewOnMap?: () => void;
}

const PLACEHOLDER_REASON = "Nothing else stood out yet — it's simply next in line.";

function useCardPhoto(frame: Frame | undefined) {
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

export function RecommendScreen({ frames = defaultFrames, onViewOnMap }: RecommendScreenProps) {
  const [decidedIds, setDecidedIds] = useState<ReadonlySet<string>>(new Set());
  const [avoidedTags, setAvoidedTags] = useState<ReadonlySet<string>>(new Set());
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const candidates = useMemo(() => frames.filter((f) => f.state === "unprinted" && !decidedIds.has(f.id)), [frames, decidedIds]);
  const profile = useMemo(() => buildProfile(frames, avoidedTags), [frames, avoidedTags]);
  const ranked: Recommendation[] = useMemo(() => rankFrames(candidates, profile), [candidates, profile]);
  const current = ranked[0];

  const photoSrc = useCardPhoto(current?.frame);

  const decide = (id: string) => setDecidedIds((prev) => new Set(prev).add(id));

  const handleLike = () => {
    if (!current) return;
    setLikedCount((n) => n + 1);
    decide(current.frame.id);
  };

  const handleSave = () => {
    if (!current) return;
    setSavedCount((n) => n + 1);
    decide(current.frame.id);
  };

  const handleSkip = () => {
    if (!current) return;
    setAvoidedTags((prev) => new Set([...prev, ...current.frame.tags]));
    decide(current.frame.id);
  };

  return (
    <div style={{ position: "relative", height: "100vh", overflow: "hidden", background: "var(--paper-3)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 16px 0", textAlign: "center", flex: "0 0 auto" }}>
        <span style={{ font: "var(--label-sm)", letterSpacing: ".18em", textTransform: "uppercase", color: "var(--ink-40)" }}>Where to today?</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        {current ? (
          <div
            style={{
              width: "min(420px, 92vw)",
              maxHeight: "100%",
              overflowY: "auto",
              background: "var(--paper-2)",
              border: "var(--stroke-heavy)",
              boxShadow: "var(--lift-4)",
              transform: "rotate(-1.5deg)",
              padding: "16px 16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {photoSrc ? (
              <div style={{ padding: 5, background: "var(--paper-print)", boxShadow: "var(--lift-print)" }}>
                <img
                  src={photoSrc}
                  alt={current.frame.name}
                  style={{ display: "block", width: "100%", height: 180, objectFit: "cover" }}
                />
              </div>
            ) : null}
            <h2 style={{ margin: 0, font: "var(--display-2)", letterSpacing: "var(--display-tracking-tight)", textTransform: "uppercase" }}>{current.frame.name}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag tone="ink">Drive {formatDrive(current.frame.driveMinutes)}</Tag>
              {current.frame.tags.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(current.reasons.length > 0
                ? current.reasons
                : [{ title: PLACEHOLDER_REASON, sub: "", weight: 0 }]
              ).map((r, i) => (
                <p key={i} style={{ margin: 0, font: "var(--body-sm)", color: "var(--text-strong)" }}>
                  {r.title}
                  {r.sub ? <span style={{ color: "var(--ink-55)" }}> — {r.sub}</span> : null}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", maxWidth: 320, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ margin: 0, font: "var(--display-3)", textTransform: "uppercase" }}>That's everything for now</p>
            <p style={{ margin: 0, font: "var(--body)", color: "var(--ink-55)" }}>
              You've been through today's picks — check back later, or explore the map yourself.
            </p>
          </div>
        )}
      </div>

      <div style={{ flex: "0 0 auto", padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" onClick={handleSkip} disabled={!current}>
            ✕ Not interested
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={!current}>
            ↓ Save for later
          </Button>
          <Button variant="primary" onClick={handleLike} disabled={!current}>
            ★ Let's go!
          </Button>
        </div>
        {likedCount || savedCount ? (
          <p style={{ margin: 0, font: "var(--label-sm)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-40)" }}>
            {likedCount} liked · {savedCount} saved for later this session
          </p>
        ) : null}
        {onViewOnMap ? (
          <Button variant="secondary" size="sm" onClick={onViewOnMap}>
            View on map →
          </Button>
        ) : null}
      </div>

      <GrainOverlay />
    </div>
  );
}
