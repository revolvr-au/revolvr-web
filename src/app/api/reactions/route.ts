import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { postId, userEmail, emoji } = await req.json();

  if (!postId || !userEmail || !emoji) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await prisma.postReaction.create({
      data: { postId, userEmail, emoji },
    });
  } catch {
    // already exists — remove (toggle)
    await prisma.postReaction.delete({
      where: {
        postId_userEmail_emoji: { postId, userEmail, emoji },
      },
    });
  }

  const counts = await prisma.postReaction.groupBy({
    by: ["emoji"],
    where: { postId },
    _count: true,
  });

  return NextResponse.json({ ok: true, counts });
}
