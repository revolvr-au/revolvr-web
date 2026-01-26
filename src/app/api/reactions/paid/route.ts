// src/app/api/reactions/paid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ALLOWED_REACTIONS = ["🔥", "❤️", "👏", "😂", "😮"] as const;
type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

const MAX_PER_USER_PER_POST = 10;

type PaidReactionBody = {
  postId?: string;
  reaction?: ReactionEmoji;
  creatorEmail?: string;
  source?: "FEED" | "LIVE";
  viewerEmail?: string; // browser fallback
};

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function emptyCounts(): Record<ReactionEmoji, number> {
  return { "🔥": 0, "❤️": 0, "👏": 0, "😂": 0, "😮": 0 };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId")?.trim();

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Pull only the rows for this post (new + legacy formats)
    const rows = await prisma.supportLedger.findMany({
      where: {
        kind: "REACTION",
        OR: [
          { targetId: { startsWith: `${postId}::` } }, // new
          { targetId: postId }, // legacy (no delimiter)
        ],
      },
      select: { targetId: true },
    });

    const counts = emptyCounts();
    let legacyCount = 0;

    for (const r of rows) {
      const targetId = typeof r.targetId === "string" ? r.targetId : "";

      // Null/empty guard (older/malformed data)
      if (!targetId) {
        legacyCount += 1;
        continue;
      }

      // Legacy row with no emoji
      if (targetId === postId) {
        legacyCount += 1;
        continue;
      }

      // New format: `${postId}::${reaction}`
      const parts = targetId.split("::");
      if (parts.length < 2) {
        legacyCount += 1;
        continue;
      }

      const emojiRaw = parts[1];
      const emoji = emojiRaw as ReactionEmoji | undefined;

      if (emoji && ALLOWED_REACTIONS.includes(emoji)) {
        counts[emoji] += 1;
      } else {
        legacyCount += 1;
      }
    }

    return NextResponse.json({ postId, counts, legacyCount }, { status: 200 });
  } catch (e: unknown) {
    console.error("[reactions/paid][GET] error", e);
    return NextResponse.json(
      { error: "Internal error", detail: errorMessage(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.PAID_REACTIONS_ENABLED !== "true") {
      return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as PaidReactionBody;

    const postId = body.postId?.trim();
    const reaction = body.reaction;
    const source = body.source ?? "FEED";

    const viewerEmail =
      req.headers.get("x-user-email")?.trim().toLowerCase() ||
      body.viewerEmail?.trim().toLowerCase() ||
      null;

    if (!viewerEmail || !postId || !reaction) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!ALLOWED_REACTIONS.includes(reaction)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    // Resolve creatorEmail if not provided
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userEmail: true },
    });

    const resolvedCreatorEmail = (body.creatorEmail ?? post?.userEmail ?? "")
      .trim()
      .toLowerCase();

    if (!resolvedCreatorEmail) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Cap: viewer reactions on this post (new + legacy)
    const existingCount = await prisma.supportLedger.count({
      where: {
        kind: "REACTION",
        viewerEmail,
        OR: [
          { targetId: { startsWith: `${postId}::` } }, // new format
          { targetId: postId }, // legacy format (no delimiter)
        ],
      },
    });

    if (existingCount >= MAX_PER_USER_PER_POST) {
      return NextResponse.json(
        { error: "Reaction limit reached" },
        { status: 400 }
      );
    }

    // Spend 1 tip credit
    const origin = new URL(req.url).origin;
    const spend = await fetch(`${origin}/api/credits/spend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: viewerEmail, kind: "reaction" }),
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

    // Record the expression
    await prisma.supportLedger.create({
      data: {
        creatorEmail: resolvedCreatorEmail,
        viewerEmail,
        kind: "REACTION",
        source,
        targetId: `${postId}::${reaction}`,
        units: 1,
        currency: "AUD",
        grossCents: 0,
        creatorCents: 0,
        platformCents: 0,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: unknown) {
    console.error("[reactions/paid][POST] error", e);
    return NextResponse.json(
      { error: "Internal error", detail: errorMessage(e) },
      { status: 500 }
    );
  }
}
