import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/[postId]/comments
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ ok: false, error: "missing_post_id" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, comments });
  } catch (err: any) {
    console.error("GET /api/posts/[postId]/comments error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load comments" },
      { status: 500 }
    );
  }
}

// POST /api/posts/[postId]/comments
export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json({ ok: false, error: "missing_post_id" }, { status: 400 });
    }

    const bodyJson = await req.json().catch(() => null);

    const userEmail = String(bodyJson?.userEmail ?? "").trim().toLowerCase();
    const body = String(bodyJson?.body ?? "").trim();

    if (!userEmail) {
      return NextResponse.json({ ok: false, error: "missing_user_email" }, { status: 400 });
    }

    if (!body) {
      return NextResponse.json({ ok: false, error: "missing_body" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userEmail,
        body,
      },
    });

    return NextResponse.json({ ok: true, comment }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/posts/[postId]/comments error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create comment" },
      { status: 500 }
    );
  }
}
