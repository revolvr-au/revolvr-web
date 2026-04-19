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
        select: { email: true, handle: true, avatarUrl: true, voltage: true },
      }),
      prisma.creatorProfile.findMany({
        where: { handle: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { email: true, handle: true, avatarUrl: true, createdAt: true },
      }),
    ]);

    const liveEmails = liveSessions.map(s => s.creatorName);

    const liveCreatorProfiles = liveEmails.length > 0
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: liveEmails } },
          select: { email: true, handle: true, avatarUrl: true },
        })
      : [];

    const liveByEmail = Object.fromEntries(liveCreatorProfiles.map(c => [c.email, c]));

    const livePeople = liveSessions
      .map(s => {
        const creator = liveByEmail[s.creatorName];
        if (!creator?.handle) return null;
        return { handle: creator.handle, avatarUrl: creator.avatarUrl ?? undefined, isLive: true, voltage: 0 };
      })
      .filter((p): p is { handle: string; avatarUrl: string | undefined; isLive: true; voltage: number } => p !== null);

    const liveHandles = new Set(livePeople.map(p => p.handle));

    const topPeople = topCreators
      .filter(c => c.handle && !liveHandles.has(c.handle))
      .map(c => ({ handle: c.handle!, avatarUrl: c.avatarUrl ?? undefined, isLive: false, voltage: c.voltage }));

    const newPeople = newCreators
      .filter(c => c.handle && !liveHandles.has(c.handle!))
      .map(c => ({ handle: c.handle!, avatarUrl: c.avatarUrl ?? undefined, isLive: false, voltage: 0, isNew: true }));

    return NextResponse.json({ live: livePeople, creators: topPeople, newPeople });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ people: [] }, { status: 500 });
  }
}
