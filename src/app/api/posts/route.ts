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
    const e = err as any;

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

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { Like: true } },
      },
    });

    const emails = Array.from(
      new Set(posts.map((p) => String(p.userEmail || "").trim().toLowerCase()).filter(Boolean))
    );

    const profiles = emails.length
  ? await prisma.creatorProfile.findMany({
      where: { email: { in: emails } },
      select: {
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        isVerified: true,
      },
    })
  : [];


    const profileByEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));

    const payload = posts.map((p) => {
      const first = (p as any).media?.[0] ?? null;
      const prof = profileByEmail.get(String(p.userEmail).toLowerCase()) ?? null;

      return {
        id: p.id,
        userEmail: p.userEmail,
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,

        media: (p as any).media ?? [],
        imageUrl: first?.url ?? (p as any).imageUrl ?? null,
        mediaType: ((first?.type ?? (p as any).mediaType ?? "image") === "video" ? "video" : "image") as
          | "image"
          | "video",

        creator: prof
  ? {
      displayName: prof.displayName,
      handle: prof.handle,
      avatarUrl: prof.avatarUrl,
      avatar_url: prof.avatarUrl,
      isVerified: prof.isVerified,
    }
  : null,
      };
    });

    return NextResponse.json({ posts: payload });
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to load posts" }, { status: 500 });
  }
}
