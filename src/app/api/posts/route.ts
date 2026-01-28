import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaIn = { type: "image" | "video"; url: string; order: number };

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

// POST /api/posts -> create post + PostMedia rows
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = String(body?.userEmail ?? "").trim().toLowerCase();
    const caption = String(body?.caption ?? "").trim();

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // Prefer new payload: media: [{type,url,order}]
    const mediaRaw = Array.isArray(body?.media) ? (body.media as any[]) : [];

    // Back-compat: if someone still sends imageUrl/mediaType, convert to media[]
    const legacyUrl = String(body?.imageUrl ?? "").trim();
    const legacyTypeRaw = String(body?.mediaType ?? "image").trim().toLowerCase();
    const legacyType: "image" | "video" = legacyTypeRaw === "video" ? "video" : "image";

    const media: MediaIn[] = (
      mediaRaw.length
        ? mediaRaw
        : legacyUrl
          ? [{ type: legacyType, url: legacyUrl, order: 0 }]
          : []
    )
      .map((m, i) => {
        const t = String(m?.type ?? "image").toLowerCase() === "video" ? "video" : "image";
        const url = String(m?.url ?? "").trim();
        const order = Number.isFinite(Number(m?.order)) ? Number(m.order) : i;
        return { type: t as "image" | "video", url, order };
      })
      .filter((m) => m.url && isHttpUrl(m.url))
      .slice(0, 10); // safety cap

    if (!media.length) {
      return NextResponse.json({ ok: false, error: "missing_media" }, { status: 400 });
    }

    // Create post + media rows atomically
    const created = await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          userEmail,
          caption,
        },
        select: { id: true },
      });

      await tx.postMedia.createMany({
        data: media
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((m, idx) => ({
            postId: post.id,
            type: m.type,
            url: m.url,
            order: idx,
          })),
      });

      return post;
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

// GET /api/posts -> list posts + media[] + like counts + verificationTier (if present)
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } },
        _count: { select: { Like: true } },
      },
    });

    // Collect distinct emails from posts (for verification tier)
    const emails = Array.from(new Set(posts.map((p) => p.userEmail).filter(Boolean))).map((e) =>
      String(e).trim().toLowerCase()
    );

    const profiles = emails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: emails } },
          select: {
            email: true,
            verificationStatus: true, // "blue" | "gold" | null
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

    // Return: media[] plus legacy imageUrl/mediaType derived from media[0]
    const payload = posts.map((p) => {
      const email = String(p.userEmail ?? "").trim().toLowerCase();
      const primary = (p as any).media?.[0] ?? null;

      return {
        id: p.id,
        userEmail: email,

        // legacy fields used by UI
        imageUrl: primary?.url ?? null,
        mediaType: (primary?.type ?? "image") as "image" | "video",

        // new field
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
