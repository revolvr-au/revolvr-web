export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "email required" },
        { status: 400 },
      );
    }

    const memberships = await prisma.gathMember.findMany({
      where: { userEmail: email },
      include: {
        gath: {
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    const gaths = memberships
      .map((m) => {
        const lastMessage = m.gath.messages[0] ?? null;
        return {
          id: m.gath.id,
          name: m.gath.name,
          description: m.gath.description,
          type: m.gath.type,
          status: m.gath.status,
          creatorEmail: m.gath.creatorEmail,
          memberCount: m.gath._count.members,
          role: m.role,
          joinedAt: m.joinedAt,
          lastMessageAt: lastMessage?.createdAt ?? m.gath.createdAt,
          lastMessage: lastMessage?.content ?? null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
      );

    return NextResponse.json({ ok: true, gaths });
  } catch (err: any) {
    console.error("gath/my-gaths error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
