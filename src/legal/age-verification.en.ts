// Age Verification Policy — plain-language description of the LIVE age gate.
//
// HONESTY CONTRACT: this copy must describe the gate that actually ships, not an
// aspirational one. The live gate is self-declared date of birth (no third-party
// identity/age vendor yet). The wording below is deliberately scoped to that:
//   - src/lib/age.ts       AU: accountMinAge 16, minorThreshold 18 (three bands)
//   - src/proxy.ts         enforcement scoped to AU (fail-closed on blank geo)
//   - src/app/api/age-verification/route.ts  raw DOB discarded; flags persisted
// If any of those change (e.g. a k-ID / vendor integration lands), this file and
// AGE_POLICY_LAST_UPDATED must change with them.
//
// STATUS: DRAFT — PENDING LEGAL REVIEW. Do not remove the in-page review banner
// or set AGE_POLICY_IS_DRAFT to false until legal signs off. All legal surfaces
// now state a 16+ minimum consistently (Terms §2 flat-16 via PR #34; Privacy §9
// and Community Guidelines aligned to 16 everywhere) — the earlier 13-vs-16
// cross-document conflict is RESOLVED and is no longer a publish blocker.
// NOTE the stated-vs-enforced gap: copy states 16+ everywhere, while the live
// gate enforces 16 in AU only (src/proxy.ts). Global enforcement is a tracked
// post-launch fast-follow, not reflected in this copy yet.

export const AGE_POLICY_IS_DRAFT = true;
export const AGE_POLICY_VERSION = "2026-07-01";
export const AGE_POLICY_LAST_UPDATED = "1 July 2026";

export const AGE_POLICY_TEXT = `
# Revolvr Age Verification Policy

**Last updated:** 1 July 2026

Revolvr is intended for people aged 16 and over. This policy explains how we check age, what we ask you for, and how we handle that information.

## 1. Minimum age
You must be at least 16 years old to hold a Revolvr account. If you are under 16, you are not permitted to use Revolvr and cannot create an account.

## 2. How we check your age
When required, we ask you for two things:
- your **date of birth**; and
- your **confirmation** that you are 16 years of age or older.

We calculate your age from the date of birth you provide. Your confirmation is recorded as your own declaration.

At present, age is **self-declared** — Revolvr does not currently use a third-party identity or age-verification service. We may introduce additional age-assurance checks in the future, and we may request further verification where we consider it necessary.

## 3. Users aged 16 and 17
If you are 16 or 17, you can use Revolvr, but some features are limited until you turn 18. In particular, direct messaging and certain other interactions are restricted for accounts we identify as belonging to people under 18. These limits are applied automatically based on the date of birth you provide, and are removed when you reach the relevant age.

## 4. Where this applies
Age checks currently apply to people accessing Revolvr from Australia. If your location cannot be determined, we apply the age check by default. We may extend age checks to other locations as our policies and legal obligations evolve.

## 5. How we handle your date of birth
We do not store your date of birth. It is used once, at the moment you provide it, to work out your age status. We then keep only:
- whether you meet the minimum age to use Revolvr;
- whether your account is treated as belonging to a person under 18; and
- the dates on which you reach the relevant ages.

The date of birth itself is discarded after your age status is calculated.

## 6. Accuracy and misuse
You are responsible for providing accurate information. Providing a false date of birth to bypass these checks is a breach of our Terms & Conditions and may result in suspension or termination of your account.

## 7. Changes to this policy
We may update this policy from time to time, including if we adopt additional age-assurance measures. When we do, we will revise the "last updated" date above.

## 8. Contact
If you have questions about this policy or your age status, please contact Revolvr support.
`;
