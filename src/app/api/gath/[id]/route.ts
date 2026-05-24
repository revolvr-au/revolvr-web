export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await Promise.resolve(params);

    const gath = await prisma.gath.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        posts: true,
      },
    });

    if (!gath) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    // Newest-last for chat display
    const messages = [...gath.messages].reverse();

    const seededPostIds = gath.posts.map((p) => p.postId);
    const seededPosts =
      seededPostIds.length > 0
        ? await prisma.post.findMany({
            where: { id: { in: seededPostIds } },
            select: {
              id: true,
              caption: true,
              imageUrl: true,
              media_url: true,
              userEmail: true,
            },
          })
        : [];

    return NextResponse.json({
      ok: true,
      gath: {
        id: gath.id,
        name: gath.name,
        description: gath.description,
        type: gath.type,
        status: gath.status,
        creatorEmail: gath.creatorEmail,
        sparkCost: gath.sparkCost,
        launchDate: gath.launchDate,
        createdAt: gath.createdAt,
        memberCount: gath.members.length,
        members: gath.members,
        messages,
        seededPosts,
      },
    });
  } catch (err: any) {
    console.error("gath/[id] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "failed" },
      { status: 500 },
    );
  }
}
