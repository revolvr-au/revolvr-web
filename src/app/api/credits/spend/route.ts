export const dynamic = "force-dynamic";

// src/app/api/credits/spend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import {
  InsufficientCreditsError,
  spendCredits,
  type SpendKind,
} from "@/lib/serverCredits";

export async function POST(req: NextRequest) {
  try {
    const { kind } = (await req.json()) as {
      kind?: SpendKind;
      postId?: string | null; // optional, for future use
    };

    const email = await getAuthedEmailOrNull();

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!kind) {
      return NextResponse.json({ error: "Missing kind" }, { status: 400 });
    }

    if (!["boost", "tip", "spin", "reaction"].includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const credits = await spendCredits(email, kind);

    return NextResponse.json({ success: true, credits }, { status: 200 });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.error("[credits/spend] error", err);
    return NextResponse.json({ error: "Failed to spend credit" }, { status: 500 });
  }
}
