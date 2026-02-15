export const dynamic = "force-dynamic";

// src/app/api/credits/spend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SpendKind = "boost" | "tip" | "spin" | "reaction" | "vote";

export async function POST(req: NextRequest) {
  try {
    const { email, kind } = (await req.json()) as {
      email?: string;
      kind?: SpendKind;
      postId?: string | null; // optional, for future use
    };

    if (!email || !kind) {
      return NextResponse.json({ error: "Missing email or kind" }, { status: 400 });
    }

    if (!["boost", "tip", "spin", "reaction", "vote"].includes(kind)) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    // Map kind to a decrement bucket (launch-safe: reaction/vote use tips)
    const updateData =
      kind === "boost"
        ? { boosts: { decrement: 1 } }
        : kind === "spin"
        ? { spins: { decrement: 1 } }
        : { tips: { decrement: 1 } }; // tip, reaction, vote

    const where =
      kind === "boost"
        ? { email, boosts: { gt: 0 } }
        : kind === "spin"
        ? { email, spins: { gt: 0 } }
        : { email, tips: { gt: 0 } };

    const result = await prisma.userCredits.updateMany({
      where,
      data: updateData,
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Not enough credits" }, { status: 400 });
    }

    const credits = await prisma.userCredits.findUnique({
      where: { email },
    });

    return NextResponse.json({ success: true, credits }, { status: 200 });
  } catch (err) {
    console.error("[credits/spend] error", err);
    return NextResponse.json({ error: "Failed to spend credit" }, { status: 500 });
  }
}
