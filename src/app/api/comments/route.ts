import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // <-- IMPORTANT: use your singleton

export async function GET(req: Request) {
  try {
    console.log("👉 GET /api/comments hit");

    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ ok: false, comments: [] });
    }

    // A soft-deleted (or missing) parent post serves no comments.
    const parent = await prisma.post.findUnique({
      where: { id: postId },
      select: { deletedAt: true },
    });
    if (!parent || parent.deletedAt) {
      return NextResponse.json({ ok: true, comments: [] });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        postId: true,
        userEmail: true,
        body: true,
        parentId: true,
        createdAt: true,
        voltage: true,
        tranched: true,
        tranchedAt: true,
      },
    });

    return NextResponse.json({ ok: true, comments });

  } catch (error) {
    console.error("🔥 GET COMMENTS ERROR:", error);
    return NextResponse.json({ ok: false, comments: [] });
  }
}
export async function POST(req: Request) {
  try {
    console.log("👉 POST /api/comments hit");

    const { postId, userEmail, body, parentId } = await req.json();

    if (!postId || !userEmail || !body) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // No new comments on a soft-deleted (or missing) parent post.
    const parent = await prisma.post.findUnique({
      where: { id: postId },
      select: { deletedAt: true },
    });
    if (!parent || parent.deletedAt) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
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

  } catch (error) {
    console.error("🔥 POST COMMENT ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}