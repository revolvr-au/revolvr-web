// src/app/api/spinner/spin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pickSpinnerOutcome } from "@/lib/spinner"; // uses the file we just created



export async function POST(req: NextRequest) {
  // ⚠️ For now, we ignore auth & credits.
  // This endpoint just returns a random outcome.

  const outcome = pickSpinnerOutcome();

  return NextResponse.json({ outcome });
}
