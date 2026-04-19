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
        },
      }),
      prisma.creatorProfile.findMany({
        where: { handle: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { email: true, handle: true, displayName: true, avatarUrl: true, createdAt: true, voltage: true },
      }),
    ]);

    // Fetch latest comment for each top creator (from their most recent post)
    const topEmails = topCreators.map(c => c.email);
    const latestPostsPerCreator = await prisma.post.findMany({
      where: { userEmail: { in: topEmails } },
      orderBy: { createdAt: "desc" },
      distinct: ["userEmail"],
      select: { id: true, userEmail: true },
    });

    const postIds = latestPostsPerCreator.map(p => p.id);
    const latestComments = postIds.length > 0
      ? await prisma.comment.findMany({
          where: { postId: { in: postIds } },
          orderBy: { createdAt: "desc" },
          distinct: ["postId"],
          select: { postId: true, body: true, userEmail: true },
        })
      : [];

    const commentByPostId = Object.fromEntries(latestComments.map(c => [c.postId, c.body]));
    const commentByEmail = Object.fromEntries(
      latestPostsPerCreator.map(p => [p.userEmail, commentByPostId[p.id] ?? null])
    );

    const liveEmails = liveSessions.map(s => s.creatorName);
    const liveCreatorProfiles = liveEmails.length > 0
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: liveEmails } },
          select: { email: true, handle: true, displayName: true, avatarUrl: true, voltage: true },
        })
      : [];

    const liveByEmail = Object.fromEntries(liveCreatorProfiles.map(c => [c.email, c]));

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
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const liveHandles = new Set(livePeople.map(p => p.handle));
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const topPeople = topCreators
      .filter(c => c.handle && !liveHandles.has(c.handle))
      .map(c => {
        const sla = c.scheduledLiveAt;
        const scheduledLiveAt = sla && sla > now && sla < in24h ? sla.toISOString() : null;
        return {
          handle: c.handle!,
          displayName: c.displayName ?? c.handle!,
          avatarUrl: c.avatarUrl ?? undefined,
          isLive: false,
          voltage: c.voltage,
          scheduledLiveAt,
          latestComment: commentByEmail[c.email] ?? null,
        };
      });

    const newPeople = newCreators
      .filter(c => c.handle && !liveHandles.has(c.handle!))
      .map(c => ({
        handle: c.handle!,
        displayName: c.displayName ?? c.handle!,
        avatarUrl: c.avatarUrl ?? undefined,
        isLive: false,
        voltage: c.voltage,
      }));

    return NextResponse.json({ live: livePeople, creators: topPeople, newPeople });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ live: [], creators: [], newPeople: [] }, { status: 500 });
  }
}
