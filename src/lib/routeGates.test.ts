import { describe, expect, it } from "vitest";
import {
  EXCLUDED_PREFIXES,
  ONBOARDING_EXEMPT_PREFIXES,
  matchesPrefix,
} from "./routeGates";

const isExcluded = (p: string) => matchesPrefix(p, EXCLUDED_PREFIXES);
const isOnboardingExempt = (p: string) =>
  matchesPrefix(p, ONBOARDING_EXEMPT_PREFIXES);

describe("matchesPrefix — segment boundaries", () => {
  it("matches the exact path", () => {
    expect(matchesPrefix("/onboard", ["/onboard"])).toBe(true);
  });

  it("matches descendants", () => {
    expect(matchesPrefix("/onboard/step-2", ["/onboard"])).toBe(true);
  });

  it("does NOT match a longer sibling segment", () => {
    // The whole point of the boundary rule: /onboard must not swallow /onboarding.
    expect(matchesPrefix("/onboarding", ["/onboard"])).toBe(false);
  });

  it("does NOT match a prefix appearing mid-path", () => {
    expect(matchesPrefix("/foo/onboard", ["/onboard"])).toBe(false);
  });

  it("is false for an empty prefix list", () => {
    expect(matchesPrefix("/anything", [])).toBe(false);
  });
});

describe("onboarding guard exemptions vs age-gate exclusions", () => {
  it("exempts /live from onboarding but NOT from the age gate", () => {
    // An un-onboarded user may watch; an un-age-verified AU user may not.
    expect(isOnboardingExempt("/live")).toBe(true);
    expect(isExcluded("/live")).toBe(false);
  });

  it("exempts a specific stream too", () => {
    expect(isOnboardingExempt("/live/abc123")).toBe(true);
    expect(isExcluded("/live/abc123")).toBe(false);
  });

  it("keeps /go-live subject to BOTH guards", () => {
    // Broadcasting requires creator status, which requires a profile. This is the
    // assertion that breaks if the segment-boundary rule ever regresses to startsWith.
    expect(isOnboardingExempt("/go-live")).toBe(false);
    expect(isExcluded("/go-live")).toBe(false);
  });

  it("keeps ordinary content subject to both guards", () => {
    for (const p of ["/public-feed", "/people", "/spark", "/tranche", "/me", "/"]) {
      expect(isOnboardingExempt(p)).toBe(false);
      expect(isExcluded(p)).toBe(false);
    }
  });
});

describe("shared exclusions", () => {
  it("excludes every redirect target, so neither guard can loop", () => {
    // /onboard, /age-verification and /underage are the three targets the proxy
    // redirects TO. All must be excluded from both guards.
    for (const target of ["/onboard", "/age-verification", "/underage"]) {
      expect(isExcluded(target)).toBe(true);
    }
  });

  it("excludes the surfaces the gate flow depends on", () => {
    for (const p of ["/api/profile/setup", "/auth/callback", "/welcome", "/legal/terms", "/studio", "/_next/static/x.js"]) {
      expect(isExcluded(p)).toBe(true);
    }
  });

  it("never lists a redirect target as onboarding-exempt", () => {
    // A target that is exempt-but-not-excluded would still loop.
    for (const target of ["/onboard", "/age-verification", "/underage"]) {
      expect(ONBOARDING_EXEMPT_PREFIXES).not.toContain(target);
    }
  });
});
