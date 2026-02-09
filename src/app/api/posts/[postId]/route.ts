import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/[postId] -> fetch a single post (legacy + media[])
export async function GET(_req: Request, { params }: { params: { postId: string } }) {
  try {
    const postId = String(params?.postId ?? "").trim();
    if (!postId) {
      return NextResponse.json({ ok: false, error: "missing_postId" }, { status: 400 });
    }

    const p = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { likes: true } },
      },
    });

    if (!p) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      id: p.id,
      userEmail: String(p.userEmail ?? "").trim().toLowerCase(),
      imageUrl: (p as any).imageUrl ?? null, // legacy
      mediaType: (p as any).mediaType ?? "image", // legacy
      media: (p as any).media ?? [],
      caption: p.caption ?? "",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likesCount: p._count.likes,
    });
  } catch (err: any) {
    console.error("GET /api/posts/[postId] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load post" },
      { status: 500 }
    );
  }
}
