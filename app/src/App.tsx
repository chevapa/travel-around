import { useState } from "react";
import { AtlasScreen } from "./components/atlas/AtlasScreen";
import { RecommendScreen } from "./components/recommend/RecommendScreen";

/**
 * Issue 141: the two top-level screens CLAUDE.md §7 describes as "two
 * ways of looking at the same system" — Recommendations ("Where next?")
 * and The Atlas ("What do I already have?"). Recommend is the default
 * landing screen per CLAUDE.md §2: the user opens the app with a
 * question, not to browse a map.
 *
 * Known v1 limitation, verified in a real browser: switching screens
 * unmounts whichever one isn't active, so a "View on map →" round trip
 * resets RecommendScreen's session-only swipe progress (decided/avoided
 * tags) rather than resuming where the user left off. Fixing this
 * properly means lifting that state up here as controlled props rather
 * than `RecommendScreen` owning it internally — a real follow-up, not
 * done under this same pass alongside the scoring engine and the screen
 * itself.
 */
export default function App() {
  const [screen, setScreen] = useState<"recommend" | "atlas">("recommend");

  if (screen === "atlas") {
    return <AtlasScreen onBackToRecommend={() => setScreen("recommend")} />;
  }
  return <RecommendScreen onViewOnMap={() => setScreen("atlas")} />;
}
