import { useState } from "react";
import { AtlasScreen } from "./components/atlas/AtlasScreen";
import { OnboardingScreen } from "./components/onboarding/OnboardingScreen";
import { RecommendScreen } from "./components/recommend/RecommendScreen";
import { hasSeenOnboarding, markOnboardingSeen } from "./lib/onboardingStorage";

/**
 * Issue 141: the two top-level screens CLAUDE.md §7 describes as "two
 * ways of looking at the same system" — Recommendations ("Where next?")
 * and The Atlas ("What do I already have?"). Recommend is the default
 * landing screen per CLAUDE.md §2: the user opens the app with a
 * question, not to browse a map.
 *
 * Issue 59: a first-time-only onboarding pass (`hasSeenOnboarding` —
 * `localStorage`-backed, this being a static site with no accounts) sits
 * in front of both. Its "Let's go →" payoff opens the chosen frame's
 * card directly on The Atlas (`initialOpenFrameId`, cleared as soon as
 * the user leaves Atlas again so a later visit doesn't keep re-opening
 * the same old card — see AtlasScreen's own doc comment on that prop).
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
  const [screen, setScreen] = useState<"onboarding" | "recommend" | "atlas">(() => (hasSeenOnboarding() ? "recommend" : "onboarding"));
  const [openFrameId, setOpenFrameId] = useState<string | undefined>(undefined);

  const goToRecommend = () => {
    setOpenFrameId(undefined);
    setScreen("recommend");
  };

  if (screen === "onboarding") {
    return (
      <OnboardingScreen
        onSkip={() => {
          markOnboardingSeen();
          setScreen("recommend");
        }}
        onLetsGo={(frameId) => {
          markOnboardingSeen();
          setOpenFrameId(frameId);
          setScreen("atlas");
        }}
      />
    );
  }
  if (screen === "atlas") {
    return <AtlasScreen onBackToRecommend={goToRecommend} initialOpenFrameId={openFrameId} />;
  }
  return <RecommendScreen onViewOnMap={() => setScreen("atlas")} />;
}
