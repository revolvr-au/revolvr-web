export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;
const REPLY_PREVIEW_COUNT = 2;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const posts = await prisma.post.findMany({
      where: { postType: "TRANCHE_ORIGINAL" },
      orderBy: [{ voltage: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        caption: true,
        originalVariants: true,
        userEmail: true,
        createdAt: true,
        voltage: true,
        _count: { select: { comments: true } },
        comments: {
          orderBy: [{ voltage: "desc" }, { createdAt: "asc" }],
          take: REPLY_PREVIEW_COUNT,
          select: {
            id: true,
            body: true,
            userEmail: true,
            voltage: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Resolve author profiles for both post authors and top-comment authors.
    const emails = Array.from(
      new Set(
        items.flatMap((p) => [
          p.userEmail,
          ...p.comments.map((c) => c.userEmail),
        ]),
      ),
    );

    const postIds = items.map((p) => p.id);

    const [profiles, breakouts] = await Promise.all([
      emails.length
        ? prisma.creatorProfile.findMany({
            where: { email: { in: emails } },
            select: {
              email: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
            },
          })
        : Promise.resolve([]),
      postIds.length
        ? prisma.trancheEvent.findMany({
            where: { postId: { in: postIds }, status: "ACTIVE" },
            select: { id: true, postId: true },
          })
        : Promise.resolve([]),
    ]);
    const profileByEmail = new Map(profiles.map((p) => [p.email, p]));
    // First active breakout per post (a post can have at most one trending moment shown).
    const trancheEventByPost = new Map<string, string>();
    for (const b of breakouts) {
      if (!trancheEventByPost.has(b.postId)) trancheEventByPost.set(b.postId, b.id);
    }

    const formatted = items.map((p) => {
      const author = profileByEmail.get(p.userEmail);
      return {
        id: p.id,
        body: p.caption,
        originalVariants: p.originalVariants,
        userEmail: p.userEmail,
        createdAt: p.createdAt,
        voltage: p.voltage,
        replyCount: p._count.comments,
        trancheEventId: trancheEventByPost.get(p.id) ?? null,
        author: {
          displayName: author?.displayName ?? null,
          handle: author?.handle ?? null,
          avatarUrl: author?.avatarUrl ?? null,
        },
        replies: p.comments.map((c) => {
          const rp = profileByEmail.get(c.userEmail);
          return {
            id: c.id,
            body: c.body,
            voltage: c.voltage,
            userEmail: c.userEmail,
            handle: rp?.handle ?? null,
            createdAt: c.createdAt,
          };
        }),
      };
    });

    return NextResponse.json({ ok: true, items: formatted, nextCursor });
  } catch (err: any) {
    console.error("tranche/originals/feed error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
