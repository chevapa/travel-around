// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { _resetOnboardingForTests, hasSeenOnboarding, markOnboardingSeen } from "./onboardingStorage";

describe("onboardingStorage", () => {
  afterEach(() => {
    _resetOnboardingForTests();
    vi.restoreAllMocks();
  });

  it("has not seen onboarding by default", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("remembers onboarding was seen after marking it", () => {
    markOnboardingSeen();
    expect(hasSeenOnboarding()).toBe(true);
  });

  it("fails soft to 'not seen' when localStorage throws (private browsing, disabled storage)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("fails soft — does not throw — when localStorage.setItem is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    expect(() => markOnboardingSeen()).not.toThrow();
  });
});
