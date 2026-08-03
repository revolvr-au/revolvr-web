import { describe, expect, it } from "vitest";
import {
  ANON_AGE_EXEMPT_PREFIXES,
  EXCLUDED_PREFIXES,
  ONBOARDING_EXEMPT_PREFIXES,
  matchesPrefix,
  safeNextPath,
} from "./routeGates";

const isExcluded = (p: string) => matchesPrefix(p, EXCLUDED_PREFIXES);
const isOnboardingExempt = (p: string) =>
  matchesPrefix(p, ONBOARDING_EXEMPT_PREFIXES);
const isAnonAgeExempt = (p: string) => matchesPrefix(p, ANON_AGE_EXEMPT_PREFIXES);

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

  it("excludes sign-in, the safety routes and the public policies", () => {
    // An age wall in front of "report a problem" is the worst version of this bug, and a
    // wall in front of /login walls the only route out of the wall.
    for (const p of [
      "/login",
      "/support",
      "/report",
      "/about",
      "/guidelines",
      "/privacy",
      "/terms",
      "/marketing",
    ]) {
      expect(isExcluded(p)).toBe(true);
      // Excluded means excluded from BOTH guards, authed included.
      expect(matchesPrefix(p, EXCLUDED_PREFIXES)).toBe(true);
    }
  });

  it("excludes tranche's support and policy routes without opening the tranche feed", () => {
    for (const p of [
      "/tranche/support",
      "/tranche/rules",
      "/tranche/terms",
      "/tranche/landing",
    ]) {
      expect(isExcluded(p)).toBe(true);
    }
    // The feed itself is content. This is the assertion that breaks if someone
    // "simplifies" the four entries above into a single "/tranche".
    expect(isExcluded("/tranche")).toBe(false);
    expect(isExcluded("/tranche/some-post")).toBe(false);
  });

  it("still gates content surfaces after the exclusions were widened", () => {
    // The widening must not have caught a content route by prefix accident.
    for (const p of ["/public-feed", "/people", "/spark", "/tranche", "/me", "/create", "/u/someone"]) {
      expect(isExcluded(p)).toBe(false);
    }
  });
});

describe("anonymous age-gate exemption", () => {
  it("exempts the redirect-only front door", () => {
    expect(isAnonAgeExempt("/")).toBe(true);
  });

  it("does NOT swallow every path despite the '/' prefix", () => {
    // The whole risk of listing "/" — if matchesPrefix ever regressed to a plain
    // startsWith, this list would exempt the entire site for anonymous visitors.
    for (const p of ["/public-feed", "/people", "/live", "/live/abc", "/u/someone", "/spark"]) {
      expect(isAnonAgeExempt(p)).toBe(false);
    }
  });

  it("keeps the front door subject to the onboarding guard", () => {
    // Anonymous-only exemption. An authed but un-onboarded user hitting "/" still gets
    // sent to /onboard — by page.tsx and by the proxy.
    expect(isOnboardingExempt("/")).toBe(false);
    expect(isExcluded("/")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("passes same-origin paths through, query and all", () => {
    expect(safeNextPath("/public-feed")).toBe("/public-feed");
    expect(safeNextPath("/live/abc123")).toBe("/live/abc123");
    expect(safeNextPath("/public-feed?tab=new")).toBe("/public-feed?tab=new");
  });

  it("returns null for absent or empty input", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });

  it("rejects every off-site form", () => {
    // This value reaches the client and comes back attacker-editable, so the gate must
    // not be turned into an open redirect.
    for (const bad of [
      "//evil.example",
      "https://evil.example",
      "http://evil.example",
      "javascript:alert(1)",
      "\\\\evil.example",
      "/\\evil.example",
      "evil.example",
      "../admin",
    ]) {
      expect(safeNextPath(bad)).toBeNull();
    }
  });
});
