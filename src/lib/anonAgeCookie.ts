// src/lib/anonAgeCookie.ts
//
// Where an ANONYMOUS visitor's age verdict lives. Authed users keep their verdict in
// profiles.age_status; an anonymous visitor has no row to write, so the verdict is a
// cookie on their own browser. Same vocabulary either way ("CLEARED" / "EXCLUDED"), so
// both branches of the proxy resolve through the one fail-closed resolver in
// src/lib/ageGate.ts — an absent, empty or unrecognised cookie reads as
// NEEDS_VERIFICATION, never PROCEED.
//
// NOT A SECURITY BOUNDARY, and deliberately unsigned. The underlying assurance is
// self-attestation: a visitor who wants past the wall types a different date of birth.
// Signing the cookie would raise the cost of the second-easiest bypass while the easiest
// one stays free, so it would buy assurance we do not have. What the cookie does buy is
// not asking the same person the same question on every navigation.
//
// The corollary, stated plainly: an EXCLUDED visitor can clear the cookie and re-attest.
// That is inherent to client-held state and is one reason the EXCLUDED lifetime is short
// rather than permanent — see below.
//
// httpOnly is set anyway. It keeps the cookie out of document.cookie and therefore out
// of reach of injected page script; it is hygiene, not the boundary.

/** Only place this name is written. The proxy reads it; the API route sets it. */
export const ANON_AGE_COOKIE = "rv_age";

const DAY_SECONDS = 24 * 60 * 60;

/**
 * Asymmetric on purpose.
 *
 * CLEARED — 180 days. Long, because re-asking a cleared adult is pure friction and the
 * answer does not change. Not "forever": a browser is a device, not a person, and a
 * shared or handed-down device should eventually be re-asked.
 *
 * EXCLUDED — 30 days. Short, because this side is the one that is wrong in the costly
 * direction. A mistyped year, or a parent's phone later used by an adult, should not be
 * a half-year lockout of a device. It is not a permanent lock and must not be mistaken
 * for one; see the tamper note above.
 */
export const ANON_AGE_MAX_AGE_SECONDS = {
  CLEARED: 180 * DAY_SECONDS,
  EXCLUDED: 30 * DAY_SECONDS,
} as const;

export type AnonAgeStatus = keyof typeof ANON_AGE_MAX_AGE_SECONDS;

/**
 * The cookie to set for a decided anonymous visitor, ready for
 * `NextResponse.cookies.set(...)`. Lifetime is derived from the status, never passed in,
 * so the two policies above cannot drift apart at a call site.
 */
export function anonAgeCookie(status: AnonAgeStatus) {
  return {
    name: ANON_AGE_COOKIE,
    value: status,
    maxAge: ANON_AGE_MAX_AGE_SECONDS[status],
    httpOnly: true,
    sameSite: "lax" as const,
    // Off on local http dev only; Vercel (preview and production) builds run with
    // NODE_ENV=production, so both get Secure.
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
