import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserEmail } from "@/lib/auth";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function DELETE(_: Request, ctx: { params: { commentId: string } }) {
  const auth = await requireUserEmail();
  if (!auth.ok) return bad("Unauthorized", auth.status);

  const { commentId } = ctx.params;

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userEmail: true },
  });

  if (!existing) return bad("Comment not found", 404);
  if (existing.userEmail !== auth.email) return bad("Not allowed", 403);

  await prisma.comment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
