import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helpers
function normEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(v);
}

function normMediaType(v: any): "image" | "video" {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "video" ? "video" : "image";
}

function parseMedia(body: any): { type: "image" | "video"; url: string }[] {
  const arr = Array.isArray(body?.media) ? body.media : [];
  const out: { type: "image" | "video"; url: string }[] = [];

  for (const it of arr) {
    const type = normMediaType(it?.type);
    const url = String(it?.url ?? "").trim();
    if (!url || !isHttpUrl(url)) continue;
    out.push({ type, url });
  }
  return out;
}

// POST /api/posts -> create post (client uploads files to storage first)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const userEmail = normEmail(body?.userEmail);
    const caption = String(body?.caption ?? "").trim();

    const media = parseMedia(body);

    // Legacy fallback
    const imageUrlLegacy = String(body?.imageUrl ?? "").trim();
    const mediaTypeLegacy = normMediaType(body?.mediaType);

    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    // Require either new media[] or legacy imageUrl
    if (media.length === 0) {
      if (!imageUrlLegacy || !isHttpUrl(imageUrlLegacy)) {
        return NextResponse.json({ ok: false, error: "no_media" }, { status: 400 });
      }
    }

    const primaryUrl = media[0]?.url || imageUrlLegacy;
    const primaryType = media[0]?.type || mediaTypeLegacy;

    const created = await prisma.post.create({
      data: {
        userEmail,
        caption,

        // Keep legacy columns populated for backwards compatibility
        // New: PostMedia rows
        ...(media.length
          ? {
              media: {
                create: media.map((m, idx) => ({
                  type: m.type,
                  url: m.url,
                  order: idx,
                })),
              },
            }
          : {}),
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

// GET /api/posts -> list posts with like counts + verification tier + media[]
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        media: { orderBy: { order: "asc" } }, // ✅ NEW
        _count: {
          // relation name is "Like" (capital L)
          select: { Like: true },
        },
      },
    });

    // Collect distinct emails
    const emails = Array.from(new Set(posts.map((p) => p.userEmail).filter(Boolean))).map((e) =>
      normEmail(e)
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

    const bluePriceId = String(process.env.STRIPE_BLUE_TICK_PRICE_ID ?? "").trim();
    const goldPriceId = String(process.env.STRIPE_GOLD_TICK_PRICE_ID ?? "").trim();

    for (const prof of profiles) {
      const email = normEmail(prof.email);
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
      const email = normEmail(p.userEmail);

      // Provide media array if present; otherwise fallback to legacy single media
      const media =
        (p as any).media?.length
          ? (p as any).media.map((m: any) => ({
              type: m.type === "video" ? "video" : "image",
              url: m.url,
              order: m.order ?? 0,
            }))
          : [];

      return {
        id: p.id,
        userEmail: email,

        // keep legacy fields in response (existing clients expect them)
        caption: p.caption,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,

        media, // ✅ NEW field

        likesCount: (p as any)._count?.Like ?? 0,
        verificationTier: (email && tierByEmail.get(email)) ?? null,
      };
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json({ message: "Failed to load posts" }, { status: 500 });
  }
}
