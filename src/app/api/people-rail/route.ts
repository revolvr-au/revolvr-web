import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [liveSessions, topCreators, newCreators] = await Promise.all([
      prisma.liveSession.findMany({
        where: { isActive: true },
        take: 5,
        orderBy: { startedAt: "desc" },
      }),
      prisma.creatorProfile.findMany({
        orderBy: { voltage: "desc" },
        take: 20,
        select: {
          email: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          voltage: true,
          scheduledLiveAt: true,
          ringTier: true,
          ringExpiresAt: true,
        },
      }),
      prisma.creatorProfile.findMany({
        where: { handle: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { email: true, handle: true, displayName: true, avatarUrl: true, createdAt: true, voltage: true, ringTier: true, ringExpiresAt: true },
      }),
    ]);

    const liveEmails = liveSessions.map(s => s.creatorName);
    const topEmails = topCreators.map(c => c.email);

    // Fetch liveCreatorProfiles and allPosts in parallel (both depend only on round-1 data)
    const [liveCreatorProfiles, allPosts] = await Promise.all([
      liveEmails.length > 0
        ? prisma.creatorProfile.findMany({
            where: { email: { in: liveEmails } },
            select: { email: true, handle: true, displayName: true, avatarUrl: true, voltage: true, ringTier: true, ringExpiresAt: true },
          })
        : Promise.resolve([]),
      prisma.post.findMany({
        where: { deletedAt: null, userEmail: { in: topEmails } },
        select: { id: true, userEmail: true },
      }),
    ]);

    const liveByEmail = Object.fromEntries(liveCreatorProfiles.map(c => [c.email, c]));

    const now = new Date();
    const effectiveTier = (ringTier: string, ringExpiresAt: Date | null) =>
      ringExpiresAt && ringExpiresAt < now ? "NONE" : ringTier;

    const livePeople = liveSessions
      .map(s => {
        const creator = liveByEmail[s.creatorName];
        if (!creator?.handle) return null;
        return {
          handle: creator.handle,
          displayName: creator.displayName ?? creator.handle,
          avatarUrl: creator.avatarUrl ?? undefined,
          isLive: true,
          voltage: creator.voltage,
          ringTier: effectiveTier(creator.ringTier as string, creator.ringExpiresAt),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const liveHandles = new Set(livePeople.map(p => p.handle));

    const postIdsByEmail: Record<string, string[]> = {};
    for (const p of allPosts) {
      if (!postIdsByEmail[p.userEmail]) postIdsByEmail[p.userEmail] = [];
      postIdsByEmail[p.userEmail].push(p.id);
    }

    const allPostIds = allPosts.map(p => p.id);

    const [commentCounts, shareCounts, recentComments] = await Promise.all([
      allPostIds.length > 0
        ? prisma.comment.groupBy({
            by: ["postId"],
            where: { postId: { in: allPostIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      allPostIds.length > 0
        ? prisma.postShare.groupBy({
            by: ["postId"],
            where: { postId: { in: allPostIds } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      allPostIds.length > 0
        ? prisma.comment.findMany({
            where: { postId: { in: allPostIds } },
            orderBy: { createdAt: "desc" },
            take: 500,
            select: { postId: true, body: true },
          })
        : Promise.resolve([]),
    ]);

    const commentCountByPostId: Record<string, number> = {};
    for (const c of commentCounts) commentCountByPostId[c.postId] = c._count.id;

    const shareCountByPostId: Record<string, number> = {};
    for (const s of shareCounts) shareCountByPostId[s.postId] = s._count.id;

    const postToEmail: Record<string, string> = {};
    for (const p of allPosts) postToEmail[p.id] = p.userEmail;

    // Latest comment across all posts per creator (recentComments already ordered by createdAt desc)
    const latestCommentByEmail: Record<string, string> = {};
    for (const c of recentComments) {
      const email = postToEmail[c.postId];
      if (email && !latestCommentByEmail[email]) latestCommentByEmail[email] = c.body;
    }

    const commentCountByEmail: Record<string, number> = {};
    const shareCountByEmail: Record<string, number> = {};
    for (const [email, postIds] of Object.entries(postIdsByEmail)) {
      commentCountByEmail[email] = postIds.reduce((sum, pid) => sum + (commentCountByPostId[pid] ?? 0), 0);
      shareCountByEmail[email] = postIds.reduce((sum, pid) => sum + (shareCountByPostId[pid] ?? 0), 0);
    }

    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const topPeople = topCreators
      .filter(c => c.handle)
      .map(c => {
        const sla = c.scheduledLiveAt;
        const scheduledLiveAt = sla && sla > now && sla < in24h ? sla.toISOString() : null;
        const postIds = postIdsByEmail[c.email] ?? [];
        return {
          handle: c.handle!,
          displayName: c.displayName ?? c.handle!,
          avatarUrl: c.avatarUrl ?? undefined,
          isLive: liveHandles.has(c.handle!),
          voltage: c.voltage,
          scheduledLiveAt,
          latestComment: latestCommentByEmail[c.email] ?? null,
          commentCount: commentCountByEmail[c.email] ?? 0,
          shareCount: shareCountByEmail[c.email] ?? 0,
          postCount: postIds.length,
          ringTier: effectiveTier(c.ringTier as string, c.ringExpiresAt),
        };
      });

    const newPeople = newCreators
      .filter(c => c.handle)
      .map(c => ({
        handle: c.handle!,
        displayName: c.displayName ?? c.handle!,
        avatarUrl: c.avatarUrl ?? undefined,
        isLive: false,
        voltage: c.voltage,
        ringTier: effectiveTier(c.ringTier as string, c.ringExpiresAt),
      }));

    return NextResponse.json(
      { live: livePeople, creators: topPeople, newPeople },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ live: [], creators: [], newPeople: [] }, { status: 500 });
  }
}
