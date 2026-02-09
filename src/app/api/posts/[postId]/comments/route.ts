import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/auth";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(_: Request, ctx: { params: { postId: string } }) {
  const { postId } = ctx.params;

  const comments = await prisma.comment.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, postId: true, userEmail: true, body: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ comments }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: { postId: string } }) {
  const auth = await requireUserEmail();
  if (!auth.ok) return bad("Unauthorized", auth.status);

  const { postId } = ctx.params;
  const body = await req.json().catch(() => null);
  const text = body?.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) return bad("Missing body");

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return bad("Post not found", 404);

  const comment = await prisma.comment.create({
    data: { postId, userEmail: auth.email, body: text.trim() },
    select: { id: true, postId: true, userEmail: true, body: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
