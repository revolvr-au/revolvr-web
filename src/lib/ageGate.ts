// src/lib/ageGate.ts
//
// Age Gate Phase 3 — the pure routing resolver. NO I/O, NO DB, NO side effects.
// It maps a stored profiles.age_status string to a routing verdict that
// middleware enforcement acts on, mirroring how src/lib/age.ts (decideAge) and
// src/lib/jurisdiction.ts (resolveJurisdiction) are each one pure, testable unit.
//
// Fail-closed: any unrecognised or absent status routes to verification
// (NEEDS_VERIFICATION), never to PROCEED — so a bad, missing, or unexpected
// value can never admit an ungated user.

export type AgeRouting = "NEEDS_VERIFICATION" | "EXCLUDED" | "PROCEED";

export function resolveAgeRouting(ageStatus: string | null | undefined): AgeRouting {
  switch (ageStatus) {
    case "CLEARED":
      return "PROCEED";
    case "EXCLUDED":
      return "EXCLUDED";
    case "PENDING":
      return "NEEDS_VERIFICATION";
    default:
      return "NEEDS_VERIFICATION"; // fail-closed: unknown/null/undefined → verify
  }
}
