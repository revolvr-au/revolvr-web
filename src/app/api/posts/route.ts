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
 * Current Supabase schema (Post table) only has:
 * id, userEmail, imageUrl, caption, createdAt, updatedAt
 * So we ONLY select those fields to avoid "column does not exist" errors.
 */
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userEmail: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ posts });
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load posts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 * For now, we ONLY write to Post fields that exist in DB.
 * We accept media[] but store ONLY the first URL into imageUrl.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userEmail = String(body?.userEmail ?? "").trim().toLowerCase();
    const caption = String(body?.caption ?? "").trim();

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const media = normalizeMedia(body);
    const legacyUrl = String(media[0]?.url ?? body?.imageUrl ?? "").trim();

    if (!legacyUrl || !/^https?:\/\//i.test(legacyUrl)) {
      return NextResponse.json({ ok: false, error: "missing_media" }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        imageUrl: legacyUrl,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err: unknown) {
    const e = err as any;

    // Prisma-style error payload (useful for debugging in Network tab)
    if (e?.name || e?.code || e?.meta) {
      return NextResponse.json(
        { ok: false, prisma: { name: e?.name, code: e?.code, meta: e?.meta }, message: e?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: (e?.message as string) || "Failed to create post" },
      { status: 500 }
    );
  }
}
