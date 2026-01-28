import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order: number };

function normalizeMedia(body: any): MediaIn[] {
  const mediaRaw: any[] = Array.isArray(body?.media) ? body.media : [];

  const media: MediaIn[] = mediaRaw
    .map((m, i) => {
      const t = String(m?.type ?? "image").trim().toLowerCase() === "video" ? "video" : "image";
      const url = String(m?.url ?? "").trim();
      const order = Number.isFinite(Number(m?.order)) ? Number(m.order) : i;
      return { type: t as "image" | "video", url, order };
    })
    .filter((m) => m.url && /^https?:\/\//i.test(m.url));

  // Legacy fallback -> convert to media[0]
  if (!media.length) {
    const imageUrl = String(body?.imageUrl ?? "").trim();
    const mediaTypeRaw = String(body?.mediaType ?? "image").trim().toLowerCase();
    const mediaType = mediaTypeRaw === "video" ? "video" : "image";

    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      media.push({ type: mediaType, url: imageUrl, order: 0 });
    }
  }

  // Ensure stable order 0..n
  return media
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m, idx) => ({ ...m, order: idx }));
}

// POST /api/posts -> create Post + PostMedia rows
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = String(body?.userEmail ?? "").trim().toLowerCase();
    const caption = String(body?.caption ?? "").trim();

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const media = normalizeMedia(body);
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
    return NextResponse.json({ ok: false, error: err?.message || "Failed to create post" }, { status: 500 });
  }
}

// GET /api/posts -> list posts (include media[], likes, verificationTier if present)
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { Like: true } },
      },
    });

    // verificationTier is optional; keep it null if creatorProfile doesn't exist
    const emails = Array.from(new Set(posts.map((p) => String(p.userEmail ?? "").trim().toLowerCase()).filter(Boolean)));

    const profiles = emails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: emails } },
          select: {
            email: true,
            verificationStatus: true,
            verificationPriceId: true,
            verificationCurrentPeriodEnd: true,
          },
        })
      : [];

    const tierByEmail = new Map<string, "blue" | "gold" | null>();
    const bluePriceId = (process.env.STRIPE_BLUE_TICK_PRICE_ID ?? "").trim();
    const goldPriceId = (process.env.STRIPE_GOLD_TICK_PRICE_ID ?? "").trim();

    for (const prof of profiles) {
      const email = String(prof.email ?? "").trim().toLowerCase();
      if (!email) continue;

      const s = String(prof.verificationStatus ?? "").trim().toLowerCase();
      if (s === "gold" || s === "blue") {
        tierByEmail.set(email, s);
        continue;
      }

      const periodEndOk =
        prof.verificationCurrentPeriodEnd && new Date(prof.verificationCurrentPeriodEnd).getTime() > Date.now();

      const priceId = prof.verificationPriceId ? String(prof.verificationPriceId).trim() : "";

      const inferred =
        periodEndOk && goldPriceId && priceId === goldPriceId
          ? "gold"
          : periodEndOk && bluePriceId && priceId === bluePriceId
            ? "blue"
            : null;

      tierByEmail.set(email, inferred);
    }

    const payload = posts.map((p) => {
      const email = String(p.userEmail ?? "").trim().toLowerCase();
      const first = (p as any).media?.[0] ?? null;

      return {
        id: p.id,
        userEmail: email,
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,
        verificationTier: (email && tierByEmail.get(email)) ?? null,

        // NEW
        media: (p as any).media ?? [],

        // LEGACY (derived from first media)
        imageUrl: first?.url ?? null,
        mediaType: (first?.type === "video" ? "video" : "image") as "image" | "video",
      };
    });

    return NextResponse.json(payload);
  } catch (err: any) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Failed to load posts" }, { status: 500 });
  }
}
