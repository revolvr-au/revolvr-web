import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");

  if (!postId) {
    return NextResponse.json({ comments: [] });
  }

  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: "asc" },
    include: {
      replies: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ comments });
}

export async function POST(req: Request) {
  const { postId, userEmail, body, parentId } = await req.json();

  if (!postId || !userEmail || !body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userEmail,
      body,
      parentId: parentId ?? null,
    },
  });

  return NextResponse.json({ ok: true, comment });
}
