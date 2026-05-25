export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gaths = await prisma.gath.findMany({
      where: {
        type: "OPEN",
        status: { in: ["ACTIVE", "PRELAUNCHING"] },
      },
      include: {
        _count: { select: { members: true } },
      },
      take: 60,
    });

    const emails = Array.from(new Set(gaths.map((g) => g.creatorEmail)));
    const profiles = emails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: emails } },
          select: { email: true, handle: true },
        })
      : [];
    const handleByEmail = new Map(profiles.map((p) => [p.email, p.handle]));

    const sorted = gaths
      .map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        status: g.status,
        creatorEmail: g.creatorEmail,
        creatorHandle: handleByEmail.get(g.creatorEmail) ?? null,
        launchDate: g.launchDate,
        memberCount: g._count.members,
        createdAt: g.createdAt,
      }))
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 20);

    return NextResponse.json({ ok: true, gaths: sorted });
  } catch (err: any) {
    console.error("gath/list error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
