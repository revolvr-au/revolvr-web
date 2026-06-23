// src/app/api/age-verification/route.ts
//
// Age Gate Phase 1 — self-attestation WRITE path. This is the step that makes
// profiles.isMinor writable, which arms the DM minor block (see src/lib/dm.ts).
//
// Division of responsibility:
//   - src/lib/age.ts (decideAge) owns the DECISION. It is pure and, by design,
//     never throws — so every "is this a real, non-future date?" check lives HERE,
//     at the route boundary, before the DOB ever reaches decideAge().
//   - this route owns: authenticate -> validate input -> persist flags + derived
//     crossover dates -> record the confirmOver16 attestation.
//
// PRIVACY (locked): the raw DOB never leaves this function. It is converted to the
// decision and then discarded; only the flags + the two crossover dates are stored.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { normalizeEmail } from "@/lib/dm";
import { decideAge } from "@/lib/age";
import { resolveJurisdiction } from "@/lib/jurisdiction";

// Jurisdiction is now derived server-side from the Vercel edge header via resolveJurisdiction — never from client input.

// Reject implausible years outright so a typo like "0202-01-01" can't slip through
// as a "cleared adult". Generous on purpose — a sanity floor, not an age policy.
const MIN_PLAUSIBLE_YEAR = 1900;

export async function GET() {
  // Unchanged in Phase 1. WHEN the gate is required / where it redirects is a
  // separate client-flow change; this step only lands the write path. Left as the
  // existing no-op status so current callers keep their behaviour.
  return NextResponse.json({ ok: true, ageGateRequired: false, status: "SKIPPED" });
}

type AgeVerificationBody = {
  dateOfBirth?: string;
  confirmOver16?: boolean;
};

/**
 * Validate a "YYYY-MM-DD" string into a UTC-midnight Date, or return null.
 *
 * `new Date("YYYY-MM-DD")` parses as UTC but is too lenient alone: "2026-02-30"
 * rolls forward to Mar 2 rather than failing. So we round-trip the parsed UTC
 * components against the input and reject any mismatch (Feb 30, month 13, day 00,
 * etc.). This is exactly the validation age.ts deliberately does not perform.
 */
function parseDob(input: string, now: Date): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12 as written
  const day = Number(m[3]);
  if (year < MIN_PLAUSIBLE_YEAR) return null;

  const dob = new Date(Date.UTC(year, month - 1, day));
  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return null; // overflow / non-existent calendar date
  }
  if (dob.getTime() > now.getTime()) return null; // future DOB; "today" (age 0) is allowed
  return dob;
}

export async function POST(request: Request) {
  const authedEmail = await getAuthedEmailOrNull();
  if (!authedEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as AgeVerificationBody;

  const now = new Date();

  // GUARD 1 — route-level input validation (age.ts never throws, so it is on us).
  if (typeof body.dateOfBirth !== "string") {
    return NextResponse.json(
      { error: "dateOfBirth is required (YYYY-MM-DD)." },
      { status: 400 }
    );
  }
  const dob = parseDob(body.dateOfBirth, now);
  if (!dob) {
    return NextResponse.json(
      { error: "dateOfBirth must be a real calendar date and not in the future." },
      { status: 400 }
    );
  }

  const jurisdiction = resolveJurisdiction(request);

  // THE DECISION — a pure function of (dob, jurisdiction, now). Note confirmOver16
  // is NOT an argument: it cannot influence the outcome.
  const decision = decideAge(dob, jurisdiction, now);

  // GUARD 2 — confirmOver16 is an ATTESTATION, recorded for audit/evidence only. It
  // must NEVER override or gate the DOB-derived decision above, so it lives in its
  // OWN column (age_attested_over16) and is never read back into logic. age_method
  // stays a clean, single-meaning provenance value. A false/absent box does NOT
  // block the write — the decision stands on the DOB alone.
  const method = "self_attest_v1";
  const attestedOver16 = body.confirmOver16 === true;

  // Key the write through the SAME normalizer the DM block reads with
  // (isUserMinor -> normalizeEmail in src/lib/dm.ts). If these diverged, a
  // mixed-case email would store isMinor under a key the block never reads and the
  // gate would silently fail open. Write-key MUST equal read-key.
  const email = normalizeEmail(authedEmail);

  try {
    await prisma.profiles.upsert({
      where: { email },
      create: {
        email,
        isMinor: decision.isMinor,
        age_status: decision.status,
        age_method: method,
        age_attested_over16: attestedOver16,
        age_jurisdiction: jurisdiction,
        age_verified_at: now,
        adult_at: decision.adultAt,
        eligible_at: decision.eligibleAt,
      },
      update: {
        isMinor: decision.isMinor,
        age_status: decision.status,
        age_method: method,
        age_attested_over16: attestedOver16,
        age_jurisdiction: jurisdiction,
        age_verified_at: now,
        adult_at: decision.adultAt,
        eligible_at: decision.eligibleAt,
        updated_at: now,
      },
    });
  } catch (e) {
    console.error("age-verification write failed:", e);
    return NextResponse.json(
      { error: "Failed to record age verification." },
      { status: 500 }
    );
  }

  // Translate the internal decision vocabulary (age.ts: CLEARED | EXCLUDED) into the
  // PUBLIC response contract the client branches on (VERIFIED | UNDERAGE_LOCKED — see
  // src/app/age-verification/page.tsx). age.ts's words must not leak onto the wire:
  // an unrecognised status falls through to a generic error on the client, so an
  // under-16 (EXCLUDED) would never reach /underage — i.e. the gate failing open at
  // the UI. EXCLUDED -> hard lock; CLEARED (adult OR 16-17 minor) -> allowed in, with
  // the DM block enforced server-side off isMinor regardless.
  const responseStatus = decision.status === "EXCLUDED" ? "UNDERAGE_LOCKED" : "VERIFIED";

  // Raw DOB is intentionally never returned (nor stored).
  return NextResponse.json({ ok: true, status: responseStatus });
}
