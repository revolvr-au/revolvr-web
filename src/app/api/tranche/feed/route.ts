export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SNIPPET_LENGTH = 200;

type Tab = "trending" | "network" | "new";

function snippet(s: string | null | undefined, n = SNIPPET_LENGTH) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tabParam = (searchParams.get("tab") ?? "trending").toLowerCase();
    const tab: Tab =
      tabParam === "network" || tabParam === "new" ? tabParam : "trending";
    const language = searchParams.get("language") ?? "en";
    const cursor = searchParams.get("cursor");
    const viewerEmail = (
      searchParams.get("viewerEmail") ?? ""
    )
      .trim()
      .toLowerCase();
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const where: Prisma.TrancheEventWhereInput = {
      status: "ACTIVE",
      originalLanguage: language,
    };

    if (tab === "network") {
      if (!viewerEmail.includes("@")) {
        return NextResponse.json({
          ok: true,
          items: [],
          nextCursor: null,
          tab,
        });
      }
      const follows = await prisma.follow.findMany({
        where: { followerEmail: viewerEmail },
        select: { followingEmail: true },
      });
      const followed = follows.map((f) => f.followingEmail);
      if (!followed.length) {
        return NextResponse.json({
          ok: true,
          items: [],
          nextCursor: null,
          tab,
        });
      }
      where.OR = [
        { commentAuthorEmail: { in: followed } },
        { postCreatorEmail: { in: followed } },
      ];
    }

    const orderBy: Prisma.TrancheEventOrderByWithRelationInput[] =
      tab === "trending"
        ? [{ breakoutVoltage: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

    const events = await prisma.trancheEvent.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        comment: {
          select: {
            id: true,
            body: true,
            userEmail: true,
            createdAt: true,
            voltage: true,
            originalLanguage: true,
          },
        },
      },
    });

    const hasMore = events.length > limit;
    const items = hasMore ? events.slice(0, limit) : events;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const postIds = Array.from(new Set(items.map((e) => e.postId)));
    const authorEmails = Array.from(
      new Set(items.map((e) => e.commentAuthorEmail)),
    );

    const [posts, profiles] = await Promise.all([
      postIds.length
        ? prisma.post.findMany({
            where: { deletedAt: null, id: { in: postIds } },
            select: {
              id: true,
              caption: true,
              userEmail: true,
              imageUrl: true,
              voltage: true,
            },
          })
        : Promise.resolve([] as Awaited<ReturnType<typeof prisma.post.findMany>>),
      authorEmails.length
        ? prisma.creatorProfile.findMany({
            where: { email: { in: authorEmails } },
            select: {
              email: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
              ringTier: true,
            },
          })
        : Promise.resolve(
            [] as Awaited<ReturnType<typeof prisma.creatorProfile.findMany>>,
          ),
    ]);

    const postById = new Map(posts.map((p) => [p.id, p]));
    const profileByEmail = new Map(profiles.map((p) => [p.email, p]));

    const formatted = items.map((e) => {
      const post = postById.get(e.postId);
      const profile = profileByEmail.get(e.commentAuthorEmail);
      return {
        id: e.id,
        createdAt: e.createdAt,
        comment: {
          id: e.comment.id,
          body: e.comment.body,
          createdAt: e.comment.createdAt,
        },
        post: {
          id: e.postId,
          captionSnippet: snippet(post?.caption ?? null),
          imageUrl: post?.imageUrl ?? null,
          creatorEmail: e.postCreatorEmail,
          voltage: post?.voltage ?? 0,
        },
        author: {
          email: e.commentAuthorEmail,
          displayName: profile?.displayName ?? null,
          handle: profile?.handle ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
          ringTier: profile?.ringTier ?? "NONE",
        },
        stats: {
          breakoutVoltage: e.breakoutVoltage,
          peakVoltage: e.peakVoltage,
          currentVoltage: e.comment.voltage,
          voltageSharePct: e.voltageSharePct,
          totalWitnesses: e.totalWitnesses,
          totalReplies: e.totalReplies,
          totalVoltsSinceBreakout: e.totalVoltsSinceBreakout,
        },
        language: e.originalLanguage,
        sponsored: e.isSponsored,
        gathId: e.gathId,
      };
    });

    return NextResponse.json({
      ok: true,
      tab,
      items: formatted,
      nextCursor,
    });
  } catch (err: any) {
    console.error("tranche/feed error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
