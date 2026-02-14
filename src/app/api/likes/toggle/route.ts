import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { postId, userEmail } = await req.json();

  if (!postId || !userEmail) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const existing = await prisma.like.findUnique({
    where: {
      postId_userEmail: { postId, userEmail },
    },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({
      data: { postId, userEmail },
    });
  }

  const count = await prisma.like.count({ where: { postId } });

  return NextResponse.json({
    ok: true,
    liked: !existing,
    count,
  });
}
