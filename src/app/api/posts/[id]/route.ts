import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/posts/[id] -> fetch a single post (legacy + media[])
export async function GET(_req: Request, { params }: { params: any }) {
  try {
    const id = String(params?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
    }

    const p = await prisma.post.findUnique({
      where: { id },
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
    console.error("GET /api/posts/[id] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load post" },
      { status: 500 }
    );
  }
}
