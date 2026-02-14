import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order: number };

function normalizeMedia(body: any): MediaIn[] {
  const mediaRaw: any[] = Array.isArray(body?.media) ? body.media : [];

  return mediaRaw
    .map((m, i): MediaIn => {
      const type: "image" | "video" =
        String(m?.type ?? "image").toLowerCase() === "video" ? "video" : "image";

      const url = String(m?.url ?? "").trim();
      const order = Number.isFinite(Number(m?.order)) ? Number(m.order) : i;

      return { type, url, order };
    })
    .filter((m) => m.url && /^https?:\/\//i.test(m.url))
    .sort((a, b) => a.order - b.order);
}

/**
 * GET /api/posts
 * Returns:
 * - likeCount
 * - likedByCurrentUser
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmailParam = searchParams.get("userEmail");
    const userEmail = userEmailParam
      ? userEmailParam.trim().toLowerCase()
      : null;

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userEmail: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { likes: true },
        },
        likes: userEmail
          ? {
              where: { userEmail },
              select: { id: true },
            }
          : false,
      },
    });

    const shaped = posts.map((p) => ({
      id: p.id,
      userEmail: p.userEmail,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likeCount: p._count.likes,
      likedByCurrentUser: userEmail ? p.likes.length > 0 : false,
    }));

    return NextResponse.json({ posts: shaped });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load posts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 * Accepts media[] but stores ONLY the first URL into imageUrl
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userEmail = String(body?.userEmail ?? "")
      .trim()
      .toLowerCase();

    const caption = String(body?.caption ?? "").trim();

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400 }
      );
    }

    const media = normalizeMedia(body);
    const legacyUrl = String(
      media[0]?.url ?? body?.imageUrl ?? ""
    ).trim();

    if (!legacyUrl || !/^https?:\/\//i.test(legacyUrl)) {
      return NextResponse.json(
        { ok: false, error: "missing_media" },
        { status: 400 }
      );
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        imageUrl: legacyUrl,
      },
      select: { id: true },
    });

    return NextResponse.json(
      { ok: true, id: created.id },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create post" },
      { status: 500 }
    );
  }
}
