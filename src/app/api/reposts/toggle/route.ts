export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { postId, userEmail } = await req.json();

  if (!postId || !userEmail) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const existing = await prisma.repost.findUnique({
    where: {
      postId_userEmail: { postId, userEmail },
    },
  });

  if (existing) {
    await prisma.repost.delete({ where: { id: existing.id } });
  } else {
    await prisma.repost.create({
      data: { postId, userEmail },
    });
  }

  const count = await prisma.repost.count({ where: { postId } });

  return NextResponse.json({
    ok: true,
    reposted: !existing,
    count,
  });
}
