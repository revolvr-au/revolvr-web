// src/lib/jurisdiction.ts
//
// Age Gate Phase 2 — server-side jurisdiction resolution.
//
// The client is NOT trusted to declare its own jurisdiction. Country is derived
// only from the Vercel edge header `x-vercel-ip-country`, which is set upstream
// of any application code and cannot be spoofed by the browser.
//
// Fail-closed rationale: a missing/empty header must NEVER open the gate, so we
// resolve to "AU" — the strictest rule in JURISDICTION_RULES (see src/lib/age.ts)
// — rather than DEFAULT. The worst case of this choice is wrongly applying the AU
// account-exclusion to a non-AU minor (low harm: a minor is over-protected). The
// failure we refuse to allow is the opposite — silently admitting an AU minor
// because geo data was absent. Strictness on the unknown side is the safe default.

export function resolveJurisdiction(request: Request): string {
  const country = request.headers.get("x-vercel-ip-country");
  return country && country.trim() ? country.trim().toUpperCase() : "AU";
}
