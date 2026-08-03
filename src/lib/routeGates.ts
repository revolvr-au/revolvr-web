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

  // ── Sign-in, safety and public information ──────────────────────────────────
  // Excluded from BOTH guards, for authed and anonymous alike. These are not
  // content surfaces, and gating them is actively wrong:
  //
  //   /login                  — a wall in front of sign-in is a wall in front of the
  //                             only route out of the wall.
  //   /support, /report       — safety routes. "Report a problem" must be reachable by
  //                             anyone, including someone the gate has just excluded.
  //   /about, /guidelines,
  //   /privacy, /terms        — the policies we are asking people to agree to. They
  //                             have to be readable before, not after, the gate.
  //   /marketing              — public marketing surface, no user content.
  //
  // Note this deliberately loosens AUTHED behaviour too: previously an un-onboarded or
  // un-verified user could not read /privacy or reach /support. That was the bug.
  "/login",
  "/support",
  "/report",
  "/about",
  "/guidelines",
  "/privacy",
  "/terms",
  "/marketing",

  // Tranche's own copies of the same four categories. Listed individually, NOT as
  // "/tranche": the tranche FEED at /tranche is content and stays gated, and the
  // segment-boundary rule is what lets these four sit beside it without opening it.
  //   /tranche/support        — a support contact form (and the TFC professional form)
  //   /tranche/rules, /terms  — the policies tranche asks people to agree to
  //   /tranche/landing        — the public landing page unauthed visitors are sent to
  "/tranche/support",
  "/tranche/rules",
  "/tranche/terms",
  "/tranche/landing",
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
 * Skipped by the age gate for ANONYMOUS visitors only. Authed users are unaffected —
 * they are already past this point, and the onboarding guard still applies here too.
 *
 * "/" qualifies because it renders nothing: src/app/page.tsx is a redirect-only router
 * (anon -> /welcome, un-onboarded -> /onboard, else -> /public-feed). Walling it leaks
 * no content and costs the entry funnel — welcome -> "Explore" -> age wall -> feed only
 * works if the front door itself is open.
 *
 * The segment-boundary rule in matchesPrefix is what keeps "/" scoped to the root:
 * pathname === "/" matches, and startsWith("//") is false for every real path, so this
 * does NOT swallow /public-feed. There is a test asserting exactly that.
 */
export const ANON_AGE_EXEMPT_PREFIXES = ["/"];

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

/**
 * Sanitize a `?next=` value into a same-origin path, or null.
 *
 * The age gate hands the blocked destination to /age-verification so a cleared visitor
 * lands where they were going instead of back at the front door. That value reaches the
 * client, so it is attacker-controllable and must never become an off-site redirect.
 *
 * Accepted: a single leading "/" followed by a path. Rejected: protocol-relative "//evil",
 * any scheme ("https:", "javascript:"), backslash forms browsers normalise to "//"
 * (\\evil, /\evil), and anything not starting with "/". Callers fall back to "/".
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  if (next.includes("\\")) return null;
  if (next.includes(":")) return null; // no scheme can survive; ":" is never needed in our paths
  return next;
}
