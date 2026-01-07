import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_VOTES_PER_USER_PER_TARGET = 20;

type VoteBody = {
  targetId?: string;
  creatorEmail?: string; // pass if you can; otherwise we store "unknown" for now
  source?: "FEED" | "LIVE";
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.PAID_VOTES_ENABLED !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as VoteBody;

    const targetId = body.targetId?.trim();
    const creatorEmail = body.creatorEmail?.trim().toLowerCase();
    const source = body.source ?? "FEED";

    const viewerEmail = req.headers.get("x-user-email")?.trim().toLowerCase() ?? null;

    if (!viewerEmail || !targetId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Cap votes for this viewer on this target
    const existingCount = await prisma.supportLedger.count({
      where: {
        kind: "VOTE",
        targetId,
        viewerEmail,
      },
    });

    if (existingCount >= MAX_VOTES_PER_USER_PER_TARGET) {
      return NextResponse.json({ error: "Vote limit reached" }, { status: 400 });
    }

    // Spend 1 credit
    const origin = new URL(req.url).origin;
    const spend = await fetch(`${origin}/api/credits/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerEmail, kind: "vote" }),
    });

    if (!spend.ok) {
      const errJson = (await spend.json().catch(() => null)) as unknown;
      const errMsg =
        typeof errJson === "object" && errJson !== null && "error" in errJson
          ? String((errJson as { error?: unknown }).error ?? "")
          : "";

      return NextResponse.json(
        { error: errMsg || "Failed to spend credit" },
        { status: 400 }
      );
    }

    // Record vote event
    await prisma.supportLedger.create({
      data: {
        creatorEmail: creatorEmail ?? "unknown",
        viewerEmail,
        kind: "VOTE",
        source,
        targetId,
        units: 1,
        currency: "AUD",
        grossCents: 0,
        creatorCents: 0,
        platformCents: 0,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: unknown) {
    console.error("[votes/paid] error", e);
    return NextResponse.json(
      { error: "Internal error", detail: errorMessage(e) },
      { status: 500 }
    );
  }
}
