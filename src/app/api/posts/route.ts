import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/posts  -> list all posts with like counts
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          // 👈 relation name is "Like" (capital L), NOT "likes"
          select: { Like: true },
        },
      },
    });

    

    // Attach verification tier (blue/gold/null) per post author.
    // We keep this as a separate lookup because posts only store userEmail.
    const emails = Array.from(
      new Set(posts.map((p) => p.userEmail).filter(Boolean))
    ) as string[];

    const profiles = emails.length
      ? await prisma.creatorProfile.findMany({
          where: { email: { in: emails } },
          select: {
            email: true,
            verificationPriceId: true,
            verificationStatus: true,
            verificationCurrentPeriodEnd: true,
          },
        })
      : [];

    const tierByEmail = new Map<string, "blue" | "gold" | null>();

    const bluePriceId = process.env.STRIPE_BLUE_TICK_PRICE_ID || "";
    const goldPriceId = process.env.STRIPE_GOLD_TICK_PRICE_ID || "";

    for (const prof of profiles) {
      const isActive =
        prof.verificationStatus === "active" &&
        (!!prof.verificationCurrentPeriodEnd &&
          new Date(prof.verificationCurrentPeriodEnd).getTime() > Date.now());

      const priceId = prof.verificationPriceId ? String(prof.verificationPriceId) : "";

      const tier =
        isActive && goldPriceId && priceId === String(goldPriceId)
          ? "gold"
          : isActive && bluePriceId && priceId === String(bluePriceId)
            ? "blue"
            : null;

      tierByEmail.set(prof.email, tier);
    }

const payload = posts.map((p) => ({
      id: p.id,
      userEmail: p.userEmail,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likesCount: p._count.Like, // number of likes
      verificationTier: tierByEmail.get(p.userEmail) ?? null,
    }));

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to load posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts  -> create a new post
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { caption, imageUrl, userEmail } = body;

    if (!caption || !imageUrl || !userEmail) {
      return NextResponse.json(
        { message: "caption, imageUrl and userEmail are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        caption,
        imageUrl,
        userEmail,
      },
    });

    // new post starts with 0 likes
    const withCount = { ...post, likesCount: 0 };

    return NextResponse.json(withCount, { status: 201 });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to create post" },
      { status: 500 }
    );
  }
}
