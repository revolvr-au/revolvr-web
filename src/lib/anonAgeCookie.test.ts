import { describe, expect, it } from "vitest";
import { resolveAgeRouting } from "./ageGate";
import {
  ANON_AGE_COOKIE,
  ANON_AGE_MAX_AGE_SECONDS,
  anonAgeCookie,
} from "./anonAgeCookie";

const DAY = 24 * 60 * 60;

describe("anon age cookie lifetimes", () => {
  it("clears for 180 days and excludes for 30", () => {
    expect(ANON_AGE_MAX_AGE_SECONDS.CLEARED).toBe(180 * DAY);
    expect(ANON_AGE_MAX_AGE_SECONDS.EXCLUDED).toBe(30 * DAY);
  });

  it("keeps EXCLUDED shorter than CLEARED", () => {
    // The asymmetry is the policy: a wrong EXCLUDED costs a device a lockout, so it
    // expires sooner than a cleared adult's answer.
    expect(ANON_AGE_MAX_AGE_SECONDS.EXCLUDED).toBeLessThan(
      ANON_AGE_MAX_AGE_SECONDS.CLEARED
    );
  });

  it("derives lifetime from the status, never from the call site", () => {
    expect(anonAgeCookie("CLEARED").maxAge).toBe(180 * DAY);
    expect(anonAgeCookie("EXCLUDED").maxAge).toBe(30 * DAY);
  });
});

describe("anon age cookie shape", () => {
  it("writes the verdict under the one shared name", () => {
    const c = anonAgeCookie("CLEARED");
    expect(c.name).toBe(ANON_AGE_COOKIE);
    expect(c.value).toBe("CLEARED");
  });

  it("is httpOnly, lax and rooted", () => {
    for (const status of ["CLEARED", "EXCLUDED"] as const) {
      const c = anonAgeCookie(status);
      expect(c.httpOnly).toBe(true);
      expect(c.sameSite).toBe("lax");
      expect(c.path).toBe("/");
    }
  });
});

describe("the cookie round-trips through the shared resolver", () => {
  it("maps its own written values to the right verdict", () => {
    // Same vocabulary as profiles.age_status on purpose — one resolver serves the authed
    // and anonymous branches of the proxy.
    expect(resolveAgeRouting(anonAgeCookie("CLEARED").value)).toBe("PROCEED");
    expect(resolveAgeRouting(anonAgeCookie("EXCLUDED").value)).toBe("EXCLUDED");
  });

  it("fails closed on an absent, empty or tampered cookie", () => {
    // What the proxy sees when request.cookies.get(...) misses, or when someone hand-sets
    // a value hoping for a fail-open default.
    for (const v of [undefined, "", "cleared", "yes", "PROCEED", "true", "1"]) {
      expect(resolveAgeRouting(v)).toBe("NEEDS_VERIFICATION");
    }
  });
});
