import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeImageUrl(url: string | null | undefined): string | null {
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
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, userEmail: true },
        },
      },
    });

    const emails = [
      ...new Set(posts.map((p) => p.userEmail).filter(Boolean)),
    ] as string[];

    const [profileRows, creatorRows] = await Promise.all([
      prisma.profiles.findMany({
        where: { email: { in: emails } },
        select: { email: true, display_name: true, avatar_url: true },
      }),
      prisma.creatorProfile.findMany({
        where: { email: { in: emails } },
        select: { email: true, handle: true, displayName: true, avatarUrl: true, ringTier: true, ringExpiresAt: true },
      }),
    ]);

    const profileByEmail = Object.fromEntries(
      profileRows.map((p) => [p.email, p])
    );
    const creatorByEmail = Object.fromEntries(
      creatorRows.map((c) => [c.email, c])
    );

    const now = new Date();
    const formatted = posts.map((p) => {
      const email = p.userEmail ?? "";
      const profile = profileByEmail[email];
      const creator = creatorByEmail[email];

      const handle = creator?.handle?.trim() || email.split("@")[0] || "user";
      const avatarUrl = profile?.avatar_url ?? creator?.avatarUrl ?? null;
      const displayName = profile?.display_name?.trim() || creator?.displayName?.trim() || handle;

      const latestComment = p.comments[0] ?? null;
      const ringTier = creator?.ringExpiresAt && creator.ringExpiresAt < now
        ? "NONE"
        : (creator?.ringTier as string | undefined) ?? "NONE";

      return {
        id: p.id,
        caption: p.caption,
        imageUrl: sanitizeImageUrl(p.imageUrl),
        cloudflareVideoId: p.cloudflareVideoId ?? null,
        userEmail: p.userEmail,
        handle,
        avatarUrl: avatarUrl ? sanitizeImageUrl(avatarUrl) : null,
        displayName,
        createdAt: p.createdAt,
        latestComment,
        ringTier,
      };
    });

    return NextResponse.json({ posts: formatted }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
