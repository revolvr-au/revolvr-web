export const dynamic = "force-dynamic";

// src/app/api/reactions/paid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { InsufficientCreditsError, spendCredits } from "@/lib/serverCredits";

const ALLOWED_REACTIONS = ["🔥", "❤️", "👏", "😂", "😮"] as const;
type ReactionEmoji = (typeof ALLOWED_REACTIONS)[number];

const MAX_PER_USER_PER_POST = 10;

type PaidReactionBody = {
  postId?: string;
  reaction?: ReactionEmoji;
  source?: "FEED" | "LIVE";
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

    const rows = await prisma.supportLedger.findMany({
      where: {
        kind: "REACTION",
        OR: [
          { targetId: { startsWith: `${postId}::` } },
          { targetId: postId },
        ],
      },
      select: { targetId: true },
    });

    const counts = emptyCounts();
    let legacyCount = 0;

    for (const r of rows) {
      const targetId = typeof r.targetId === "string" ? r.targetId : "";

      if (!targetId) {
        legacyCount += 1;
        continue;
      }

      if (targetId === postId) {
        legacyCount += 1;
        continue;
      }

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

    const email = await getAuthedEmailOrNull();
    const postId = body.postId?.trim();
    const reaction = body.reaction;
    const source = body.source ?? "FEED";

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!postId || !reaction) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!ALLOWED_REACTIONS.includes(reaction)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userEmail: true, deletedAt: true },
    });

    if (!post || post.deletedAt) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const creatorEmail = String(post.userEmail ?? "").trim().toLowerCase();

    if (!creatorEmail) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existingCount = await prisma.supportLedger.count({
      where: {
        kind: "REACTION",
        viewerEmail: email,
        OR: [
          { targetId: { startsWith: `${postId}::` } },
          { targetId: postId },
        ],
      },
    });

    if (existingCount >= MAX_PER_USER_PER_POST) {
      return NextResponse.json(
        { error: "Reaction limit reached" },
        { status: 400 }
      );
    }

    await spendCredits(email, "reaction");

    await prisma.supportLedger.create({
      data: {
        creatorEmail,
        viewerEmail: email,
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
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    console.error("[reactions/paid][POST] error", e);
    return NextResponse.json(
      { error: "Internal error", detail: errorMessage(e) },
      { status: 500 }
    );
  }
}
