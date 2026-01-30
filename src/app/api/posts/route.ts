import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { _Prisma } from "../../../generated/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order: number };

function normalizeMedia(body: any): MediaIn[] {
  const mediaRaw: any[] = Array.isArray(body?.media) ? body.media : [];

  return mediaRaw
    .map((m, i): MediaIn => {
      const type: "image" | "video" =
        String(m?.type ?? "image").toLowerCase() === "video"
          ? "video"
          : "image";
      const url = String(m?.url ?? "").trim();
      const order = Number.isFinite(Number(m?.order)) ? Number(m.order) : i;
      return { type, url, order };
    })
    .filter((m) => m.url && /^https?:\/\//i.test(m.url))
    .sort((a, b) => a.order - b.order);
}

/* =========================================================
   POST /api/posts  – create post + PostMedia
   ========================================================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userEmail = String(body?.userEmail ?? "")
      .trim()
      .toLowerCase();
    const captionRaw = String(body?.caption ?? "");
    const caption = captionRaw.trim() || ""; // caption is required in schema

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400 },
      );
    }

    const media = normalizeMedia(body);

    // ALWAYS compute legacyUrl/type (even if media[] is empty)
    const legacyUrl = String(media[0]?.url ?? body?.imageUrl ?? "").trim();
    const _legacyType: "image" | "video" = (media[0]?.type ??
      (String(body?.mediaType ?? "image").toLowerCase() === "video"
        ? "video"
        : "image")) as "image" | "video";

    if (!legacyUrl || !/^https?:\/\//i.test(legacyUrl)) {
      return NextResponse.json(
        { ok: false, error: "missing_media" },
        { status: 400 },
      );
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        imageUrl: legacyUrl, // ✅ required by schema
        // mediaType: _legacyType,  // optional (schema has default)
        ...(media.length
          ? {
              media: {
                create: media.map((m) => ({
                  url: m.url,
                  type: m.type,
                  order: m.order,
                })),
              },
            }
          : {}),
      },
      include: { media: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err: unknown) {
    // If it's a _Prisma-ish error, include extra debug fields
    const e = err as any;

    if (e?.name || e?.code || e?.meta) {
      return NextResponse.json(
        {
          ok: false,
          prisma: {
            name: e?.name,
            code: e?.code,
            meta: e?.meta,
          },
          message: e?.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: false, error: (e?.message as string) || "Failed to create post" },
      { status: 500 },
    );
  }
}
/* =========================================================
   GET /api/posts – public feed
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
        userEmail: p.userEmail,
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,

        media: (p as any).media ?? [],

        // legacy fallback (keep existing fields)
        imageUrl: first?.url ?? (p as any).imageUrl ?? null,
        mediaType: ((first?.type ?? (p as any).mediaType ?? "image") === "video"
          ? "video"
          : "image") as "image" | "video",
      };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load posts" },
      { status: 500 },
    );
  }
}
