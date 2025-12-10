// src/app/api/credits/spend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SpendKind = "boost" | "tip" | "spin";

export async function POST(req: NextRequest) {
  try {
    const { email, kind } = (await req.json()) as {
      email?: string;
      kind?: SpendKind;
      postId?: string | null; // optional, for future use
    };

    if (!email || !kind) {
      return NextResponse.json(
        { error: "Missing email or kind" },
        { status: 400 }
      );
    }

    if (!["boost", "tip", "spin"].includes(kind)) {
      return NextResponse.json(
        { error: "Invalid kind" },
        { status: 400 }
      );
    }

    // Atomic decrement using updateMany + condition > 0
    const updateData =
      kind === "boost"
        ? { boosts: { decrement: 1 } }
        : kind === "tip"
        ? { tips: { decrement: 1 } }
        : { spins: { decrement: 1 } };

    const where =
      kind === "boost"
        ? { email, boosts: { gt: 0 } }
        : kind === "tip"
        ? { email, tips: { gt: 0 } }
        : { email, spins: { gt: 0 } };

    const result = await prisma.userCredits.updateMany({
      where,
      data: updateData,
    });

    if (result.count === 0) {
      // No row matched => no credits of that type left
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 400 }
      );
    }

    // Fetch updated credits to return to the client
    const credits = await prisma.userCredits.findUnique({
      where: { email },
    });

    return NextResponse.json(
      { success: true, credits },
      { status: 200 }
    );
  } catch (err) {
    console.error("[credits/spend] error", err);
    return NextResponse.json(
      { error: "Failed to spend credit" },
      { status: 500 }
    );
  }
}
