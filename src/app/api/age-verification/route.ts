// src/app/api/age-verification/route.ts
import { NextResponse } from "next/server";

// TEMP: disable AU age gate logic so we can ship Live + feed.
// Later we can rewire this using @supabase/ssr properly.

export async function GET(_request: Request) {
  return NextResponse.json({
    ok: true,
    ageGateRequired: false,
    status: "SKIPPED",
  });
}

type AgeVerificationBody = {
  dateOfBirth?: string;
  confirmOver16?: boolean;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as AgeVerificationBody;

  return NextResponse.json({
    ok: true,
    ageGateRequired: false,
    status: "SKIPPED",
    received: body ?? null,
  });
}
