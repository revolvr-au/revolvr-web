import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/posts -> create a post row (media already uploaded to storage by client)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = String(body?.userEmail ?? "")
      .trim()
      .toLowerCase();

    const caption = String(body?.caption ?? "").trim();

    const imageUrl = String(body?.imageUrl ?? "").trim();
    const mediaTypeRaw = String(body?.mediaType ?? "image").trim().toLowerCase();
    const mediaType = mediaTypeRaw === "video" ? "video" : "image";

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json({ ok: false, error: "invalid_imageUrl" }, { status: 400 });
    }

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,
        imageUrl,
        mediaType,
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

// GET /api/posts -> list all posts with like counts + verification tier
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          // relation name is "Like" (capital L)
          select: { Like: true },
        },
      },
    });

    // Collect distinct emails from posts
    const emails = Array.from(new Set(posts.map((p) => p.userEmail).filter(Boolean))).map((e) =>
      String(e).trim().toLowerCase()
    );

    const profiles = emails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: emails } },
          select: {
            email: true,
            verificationStatus: true, // expected: "blue" | "gold" | null
            verificationPriceId: true, // optional fallback
            verificationCurrentPeriodEnd: true, // optional fallback
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
      return {
        id: p.id,
        userEmail: email,
        imageUrl: p.imageUrl,
        mediaType: p.mediaType ?? "image",
        caption: p.caption,
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
