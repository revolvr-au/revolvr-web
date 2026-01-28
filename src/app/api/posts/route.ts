import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order?: number };

function isHttpUrl(s: unknown): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s.trim());
}

// POST /api/posts -> create Post + PostMedia[]
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = String(body?.userEmail ?? "").trim().toLowerCase();
    const caption = String(body?.caption ?? "").trim();

    const mediaRaw = Array.isArray(body?.media) ? (body.media as any[]) : [];
    const media = mediaRaw
      .map((m, i) => ({
        type: (String(m?.type ?? "image").toLowerCase() === "video" ? "video" : "image") as "image" | "video",
        url: String(m?.url ?? "").trim(),
        order: Number.isFinite(Number(m?.order)) ? Number(m.order) : i,
      }))
      .filter((m) => isHttpUrl(m.url));

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    if (!media.length) {
      return NextResponse.json({ ok: false, error: "missing_media" }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        media: {
          createMany: {
            data: media.map((m) => ({
              type: m.type,
              url: m.url,
              order: m.order ?? 0,
            })),
          },
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

// GET /api/posts -> list all posts with media[] + legacy fields (imageUrl/mediaType) for UI compatibility
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { Like: true } },
      },
    });

    // creator verification tier mapping (existing behavior)
    const emails = Array.from(new Set(posts.map((p) => p.userEmail).filter(Boolean))).map((e) =>
      String(e).trim().toLowerCase()
    );

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
        prof.verificationCurrentPeriodEnd &&
        new Date(prof.verificationCurrentPeriodEnd).getTime() > Date.now();

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
      const legacyImageUrl = first?.url ?? null;
      const legacyMediaType = (first?.type === "video" ? "video" : "image") as "image" | "video";

      return {
        id: p.id,
        userEmail: email,
        // legacy fields used across the app
        imageUrl: legacyImageUrl,
        mediaType: legacyMediaType,
        // new field for carousel
        media: (p as any).media ?? [],
        caption: p.caption ?? "",
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        likesCount: p._count.Like,
        verificationTier: (email && tierByEmail.get(email)) ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ message: "Failed to load posts" }, { status: 500 });
  }
}
