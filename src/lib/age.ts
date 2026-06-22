// src/lib/age.ts
//
// Age Gate Phase 1 — the pure age-decision core. NO I/O, NO DB, NO geo, NO side
// effects. Given a date of birth, a jurisdiction code, and "now", it returns a
// decision plus the two derived crossover dates the API persists.
//
// This file is the jurisdiction seam: adding a country later = add one row to
// JURISDICTION_RULES. Per-country compliance / age-assurance is NOT in scope here.
//
// Privacy (locked): raw DOB is never stored. The caller converts DOB -> this
// decision, persists the flags + crossover dates, and discards the DOB.
//
// All date math is done in UTC so the result is deterministic regardless of the
// server's timezone. Callers should pass DOB parsed as UTC midnight ("YYYY-MM-DD"
// via `new Date(s)` already parses as UTC) and `now` as the current instant.

export const JURISDICTION_RULES: Record<
  string,
  { accountMinAge: number | null; minorThreshold: number }
> = {
  AU: { accountMinAge: 16, minorThreshold: 18 },
  DEFAULT: { accountMinAge: null, minorThreshold: 18 }, // no account exclusion; just flag minors
};

export type AgeDecision = {
  status: "CLEARED" | "EXCLUDED";
  isMinor: boolean;
  adultAt: Date; // when they cross minorThreshold (may be in the past for adults)
  eligibleAt: Date | null; // when they cross accountMinAge; null if already eligible or no min
};

/**
 * Whole years between `dob` and `now`, computed in UTC. The birthday is considered
 * reached when (month, day) of `now` >= (month, day) of `dob`. A Feb-29 DOB therefore
 * "has its birthday" on Mar 1 in non-leap years — a consistent, defensible convention
 * that falls out of the month/day comparison and matches `addYears` below.
 */
export function computeAge(dob: Date, now: Date): number {
  const dm = dob.getUTCMonth();
  const dd = dob.getUTCDate();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dm || (now.getUTCMonth() === dm && now.getUTCDate() < dd);
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * `dob` shifted forward by `n` years, in UTC. Feb 29 + a non-leap target year rolls
 * naturally to Mar 1 (Date.UTC normalises the overflow) — same convention computeAge uses.
 */
function addYears(dob: Date, n: number): Date {
  return new Date(Date.UTC(dob.getUTCFullYear() + n, dob.getUTCMonth(), dob.getUTCDate()));
}

/**
 * Pure age decision. dob + jurisdiction + now -> decision. No DB, no geo, no side effects.
 *
 *   - accountMinAge != null && age < accountMinAge -> EXCLUDED, isMinor: true
 *   - else age < minorThreshold                    -> CLEARED,  isMinor: true
 *   - else                                         -> CLEARED,  isMinor: false
 *
 * Unknown jurisdiction codes fall back to DEFAULT (flag minors, exclude no one).
 */
export function decideAge(dob: Date, jurisdiction: string, now: Date): AgeDecision {
  const rule = JURISDICTION_RULES[jurisdiction] ?? JURISDICTION_RULES.DEFAULT;
  const age = computeAge(dob, now);

  // Always derive the adulthood crossover; set the eligibility crossover only when the
  // user is below the account minimum (otherwise they are already eligible -> null).
  const adultAt = addYears(dob, rule.minorThreshold);
  const belowAccountMin = rule.accountMinAge != null && age < rule.accountMinAge;
  const eligibleAt = belowAccountMin ? addYears(dob, rule.accountMinAge as number) : null;

  if (belowAccountMin) {
    return { status: "EXCLUDED", isMinor: true, adultAt, eligibleAt };
  }
  if (age < rule.minorThreshold) {
    return { status: "CLEARED", isMinor: true, adultAt, eligibleAt };
  }
  return { status: "CLEARED", isMinor: false, adultAt, eligibleAt };
}
