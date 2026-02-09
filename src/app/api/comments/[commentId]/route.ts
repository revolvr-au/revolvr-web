import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/comments/[commentId]
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json({ ok: false, error: "missing_comment_id" }, { status: 400 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, comment });
  } catch (err: any) {
    console.error("GET /api/comments/[commentId] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load comment" },
      { status: 500 }
    );
  }
}

// DELETE /api/comments/[commentId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;

    if (!commentId) {
      return NextResponse.json({ ok: false, error: "missing_comment_id" }, { status: 400 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/comments/[commentId] error:", err);

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to delete comment" },
      { status: 500 }
    );
  }
}
