import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SPARK_VOLTAGE_THRESHOLD = 0; // TODO: raise to 10 before launch

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      return parsed.origin + parsed.pathname;
    } catch {
      return null;
    }
  }
  if (url.startsWith("/")) return url;
  return null;
}

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: {
        deletedAt: null,
        OR: [
          { sparkEligible: true },
          { voltage: { gte: SPARK_VOLTAGE_THRESHOLD } },
        ],
      },
      orderBy: { voltage: "desc" },
      take: 50,
    });

    const emails = [...new Set(posts.map((p) => p.userEmail).filter(Boolean))] as string[];

    const [profileRows, creatorRows] = await Promise.all([
      prisma.profiles.findMany({
        where: { email: { in: emails } },
        select: { email: true, display_name: true, avatar_url: true },
      }),
      prisma.creatorProfile.findMany({
        where: { email: { in: emails } },
        select: {
          email: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          ringTier: true,
          ringExpiresAt: true,
          voltage: true,
        },
      }),
    ]);

    const profileByEmail = Object.fromEntries(profileRows.map((p) => [p.email, p]));
    const creatorByEmail = Object.fromEntries(creatorRows.map((c) => [c.email, c]));

    const now = new Date();

    const formatted = posts.map((p) => {
      const email = p.userEmail ?? "";
      const profile = profileByEmail[email];
      const creator = creatorByEmail[email];

      const handle = creator?.handle?.trim() || email.split("@")[0] || "user";
      const avatarUrl = profile?.avatar_url ?? creator?.avatarUrl ?? null;
      const displayName =
        profile?.display_name?.trim() || creator?.displayName?.trim() || handle;

      const ringTier =
        creator?.ringExpiresAt && creator.ringExpiresAt < now
          ? "NONE"
          : (creator?.ringTier as string | undefined) ?? "NONE";

      // Use post-level voltage if set, else fall back to creator voltage
      const voltage =
        p.voltage > 0 ? p.voltage : (creator?.voltage ?? 0);

      return {
        id: p.id,
        caption: p.caption,
        imageUrl: sanitizeUrl(p.imageUrl),
        media_url: sanitizeUrl(p.media_url),
        postType: p.postType,
        sparkEligible: p.sparkEligible,
        voltage,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        userEmail: p.userEmail,
        handle,
        avatarUrl: avatarUrl ? sanitizeUrl(avatarUrl) : null,
        displayName,
        ringTier,
      };
    });

    return NextResponse.json(
      { posts: formatted },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch spark posts";
    console.error("[/api/spark]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
