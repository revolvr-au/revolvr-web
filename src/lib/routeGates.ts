// src/lib/routeGates.ts
//
// Which paths each proxy guard skips. Pure data + one pure matcher, NO I/O — same shape
// as src/lib/ageGate.ts and src/lib/jurisdiction.ts, with enforcement left to
// src/proxy.ts. Extracted so the /live-vs-/go-live boundary below is testable rather
// than asserted in a comment.

/**
 * Skipped by BOTH the age gate and the onboarding guard.
 *
 * Every prefix here is either a redirect TARGET of one of those guards or a surface one
 * of them depends on, so dropping one from either guard is a redirect loop — which is
 * why this list is shared rather than per-guard.
 */
export const EXCLUDED_PREFIXES = [
  "/studio",
  "/api",
  "/auth",
  "/age-verification",
  "/underage",
  "/welcome",
  "/onboard",
  "/_next",
  "/legal",
];

/**
 * Skipped by the ONBOARDING guard only — the age gate still applies.
 *
 * An un-onboarded user may watch a stream; an un-age-verified AU user may not. So /live
 * must NOT go in EXCLUDED_PREFIXES: that would drop it from both guards and let an
 * unverified AU account straight into live content.
 *
 * Safe to keep out of the shared list because /live is not a redirect target of either
 * guard — only /onboard, /age-verification and /underage need loop protection, and all
 * three live above.
 *
 * /go-live is deliberately ABSENT: broadcasting requires creator status, which requires a
 * profile, so it stays subject to the onboarding guard. matchesPrefix's segment-boundary
 * rule is what makes that hold.
 */
export const ONBOARDING_EXEMPT_PREFIXES = ["/live"];

/**
 * Segment-boundary prefix match: a prefix matches only its exact path or a descendant
 * (prefix + "/..."). So "/onboard" never matches a future "/onboarding", and "/live"
 * never matches "/go-live".
 */
export function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}
