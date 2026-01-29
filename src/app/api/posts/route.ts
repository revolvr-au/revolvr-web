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

/* =========================================================
   POST /api/posts  – create post + PostMedia
   - IMPORTANT: do NOT write Post.imageUrl/Post.mediaType (not in Prisma model on Vercel)
   - Legacy support: if media[] empty but imageUrl provided, convert it to media[0]
   ========================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = String(body?.userEmail ?? "").trim().toLowerCase();
    const caption = String(body?.caption ?? "").trim();

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    let media = normalizeMedia(body);

    // Legacy fallback: imageUrl/mediaType -> media[0]
    const legacyUrl = String(body?.imageUrl ?? "").trim();
    const legacyType: "image" | "video" =
      String(body?.mediaType ?? "image").toLowerCase() === "video" ? "video" : "image";

    if (!media.length && legacyUrl && /^https?:\/\//i.test(legacyUrl)) {
      media = [{ type: legacyType, url: legacyUrl, order: 0 }];
    }

    if (!media.length) {
      return NextResponse.json({ ok: false, error: "missing_media" }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        media: {
          create: media.map((m) => ({
            type: m.type,
            url: m.url,
            order: m.order,
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to create post" },
      { status: 500 }
    );
  }
}

/* =========================================================
   GET /api/posts – public feed
   - Legacy fields are derived from first PostMedia row
   ========================================================= */
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { Like: true } },
      },
    });

    const payload = posts.map((p) => {
      const first = (p as any).media?.[0] ?? null;

      return {
        id: p.id,
        userEmail: String(p.userEmail ?? "").trim().toLowerCase(),
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,

        // NEW
        media: (p as any).media ?? [],

        // LEGACY (derived)
        imageUrl: first?.url ?? null,
        mediaType: (first?.type === "video" ? "video" : "image") as "image" | "video",
      };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load posts" },
      { status: 500 }
    );
  }
}
