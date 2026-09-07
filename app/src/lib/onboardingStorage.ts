/**
 * Issue 59: "not needed for a returning user, but the first needs a
 * choice questionnaire." This app has no accounts and no persisted visit
 * history beyond its one fixed dataset, so "first-time" is approximated
 * the only honest way a static site can: has this browser seen the
 * onboarding screen before. `localStorage` rather than a cookie/server
 * flag — same "no write API in this static site" scope as everywhere
 * else session state gets tracked (`AtlasScreen`'s `saveNewFrame`/
 * want-to-go star).
 *
 * Fails soft to "not seen" when storage is unavailable (private
 * browsing, disabled storage, or a non-browser test environment) —
 * showing onboarding an extra time is a much smaller problem than an
 * uncaught exception blocking the whole app from rendering.
 */
const KEY = "travel-around:onboarding-seen";

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // storage unavailable — onboarding just shows again next time, not fatal
  }
}

/** Test-only: clears the flag so tests don't leak state across each other via jsdom's shared localStorage. */
export function _resetOnboardingForTests(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clean up if storage was never available
  }
}
