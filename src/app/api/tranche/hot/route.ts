export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VELOCITY_WINDOW_MS = 30 * 60 * 1000;
const SNIPPET_LENGTH = 200;

function snippet(s: string | null | undefined, n = SNIPPET_LENGTH) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get("language") ?? "en";

    const events = await prisma.trancheEvent.findMany({
      where: { status: "ACTIVE", originalLanguage: language },
      select: {
        id: true,
        postId: true,
        commentAuthorEmail: true,
        postCreatorEmail: true,
        commentId: true,
        breakoutVoltage: true,
        peakVoltage: true,
        voltageSharePct: true,
        totalWitnesses: true,
        totalReplies: true,
        totalVoltsSinceBreakout: true,
        originalLanguage: true,
        isSponsored: true,
        gathId: true,
        createdAt: true,
      },
    });

    if (events.length === 0) {
      return NextResponse.json({ ok: true, event: null });
    }

    // Velocity = CommentVoltageEvent count in the last 30 min, grouped by commentId.
    const windowStart = new Date(Date.now() - VELOCITY_WINDOW_MS);
    const commentIds = events.map((e) => e.commentId);
    const velocityRows = await prisma.commentVoltageEvent.groupBy({
      by: ["commentId"],
      where: {
        commentId: { in: commentIds },
        createdAt: { gte: windowStart },
      },
      _count: { _all: true },
    });
    const velocityByComment = new Map(
      velocityRows.map((r) => [r.commentId, r._count._all]),
    );

    let chosen: typeof events[number] | null = null;
    let chosenVelocity = 0;

    for (const e of events) {
      const v = velocityByComment.get(e.commentId) ?? 0;
      if (v > chosenVelocity) {
        chosen = e;
        chosenVelocity = v;
      }
    }

    // Fallback: no events have any velocity in the window — pick by totalVoltsSinceBreakout.
    if (chosenVelocity === 0) {
      chosen = events.reduce<typeof events[number] | null>(
        (best, e) =>
          best === null || e.totalVoltsSinceBreakout > best.totalVoltsSinceBreakout
            ? e
            : best,
        null,
      );
    }

    if (!chosen) {
      return NextResponse.json({ ok: true, event: null });
    }

    // Velocity is voltes-per-30-min — multiply by 2 to get per-hour.
    const voltsPerHour = chosenVelocity * 2;

    // Hydrate the chosen event with comment, post, profile data — same shape as /api/tranche/feed.
    const [comment, post, profile] = await Promise.all([
      prisma.comment.findUnique({
        where: { id: chosen.commentId },
        select: {
          id: true,
          body: true,
          userEmail: true,
          createdAt: true,
          voltage: true,
        },
      }),
      prisma.post.findUnique({
        where: { id: chosen.postId },
        select: { id: true, caption: true, userEmail: true, imageUrl: true, voltage: true, deletedAt: true },
      }),
      prisma.creatorProfile.findUnique({
        where: { email: chosen.commentAuthorEmail },
        select: { email: true, displayName: true, handle: true, avatarUrl: true, ringTier: true },
      }),
    ]);

    if (!comment || post?.deletedAt) {
      return NextResponse.json({ ok: true, event: null });
    }

    const event = {
      id: chosen.id,
      createdAt: chosen.createdAt,
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
      },
      post: {
        id: chosen.postId,
        captionSnippet: snippet(post?.caption ?? null),
        imageUrl: post?.imageUrl ?? null,
        creatorEmail: chosen.postCreatorEmail,
        voltage: post?.voltage ?? 0,
      },
      author: {
        email: chosen.commentAuthorEmail,
        displayName: profile?.displayName ?? null,
        handle: profile?.handle ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        ringTier: profile?.ringTier ?? "NONE",
      },
      stats: {
        breakoutVoltage: chosen.breakoutVoltage,
        peakVoltage: chosen.peakVoltage,
        currentVoltage: comment.voltage,
        voltageSharePct: chosen.voltageSharePct,
        totalWitnesses: chosen.totalWitnesses,
        totalReplies: chosen.totalReplies,
        totalVoltsSinceBreakout: chosen.totalVoltsSinceBreakout,
      },
      language: chosen.originalLanguage,
      sponsored: chosen.isSponsored,
      gathId: chosen.gathId,
      voltsPerHour,
    };

    return NextResponse.json({ ok: true, event });
  } catch (err: any) {
    console.error("tranche/hot error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
