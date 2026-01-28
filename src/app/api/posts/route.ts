import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order: number };

function asEmail(v: unknown) {
  const s = String(v ?? "").trim().toLowerCase();
  return s.includes("@") ? s : "";
}

function asHttpUrl(v: unknown) {
  const s = String(v ?? "").trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

function normalizeMedia(body: any): MediaIn[] {
  const mediaRaw = Array.isArray(body?.media) ? (body.media as any[]) : [];

  const mediaFromArray: MediaIn[] = mediaRaw
    .map((m, i) => ({
      type: (String(m?.type ?? "image").toLowerCase() === "video" ? "video" : "image") as "image" | "video",
      url: asHttpUrl(m?.url),
      order: Number.isFinite(Number(m?.order)) ? Number(m.order) : i,
    }))
    .filter((m) => Boolean(m.url));

  if (mediaFromArray.length) {
    return mediaFromArray.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // ✅ Legacy fallback: imageUrl + mediaType
  const legacyUrl = asHttpUrl(body?.imageUrl);
  if (legacyUrl) {
    const t = String(body?.mediaType ?? "image").toLowerCase() === "video" ? "video" : "image";
    return [{ type: t as "image" | "video", url: legacyUrl, order: 0 }];
  }

  return [];
}

// POST /api/posts -> create post + PostMedia rows
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as any;

    const userEmail = asEmail(body?.userEmail);
    const caption = String(body?.caption ?? "").trim();
    const media = normalizeMedia(body);

    if (!userEmail) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    if (!media.length) {
      return NextResponse.json({ ok: false, error: "missing_media" }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,

        // ✅ New: always write PostMedia rows
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

// GET /api/posts -> list posts with media + like counts (+verificationTier if present elsewhere)
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
      const media = (p as any).media ?? [];
      const first = media[0] ?? null;

      return {
        id: p.id,
        userEmail: String(p.userEmail ?? "").trim().toLowerCase(),
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,

        // ✅ Keep legacy fields for UI compatibility (derived from media)
        imageUrl: first?.url ?? null,
        mediaType: (first?.type === "video" ? "video" : "image") as "image" | "video",

        // ✅ New
        media: media.map((m: any) => ({
          id: m.id,
          type: (String(m.type).toLowerCase() === "video" ? "video" : "image") as "image" | "video",
          url: String(m.url),
          order: Number(m.order ?? 0),
          createdAt: m.createdAt,
        })),
      };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ message: "Failed to load posts" }, { status: 500 });
  }
}
