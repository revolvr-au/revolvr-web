import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const [livePosts, feedPosts] = await Promise.all([
      // Active LIVE posts — always float to top (IVS or Mux)
      prisma.post.findMany({
        where: {
          postType: "LIVE",
          OR: [
            { ivsPlaybackUrl: { not: null }, liveEndedAt: null },
            { liveStream: { status: "ACTIVE" } },
          ]
        },
        orderBy: { voltage: "desc" },
        take: 5,
        include: {
          liveStream: { select: { id: true, status: true, muxPlaybackId: true, liveStartedAt: true } },
          comments: { where: { parentId: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, userEmail: true } },
          media: { orderBy: { order: "asc" }, select: { type: true, url: true, order: true } },
        },
      }),
      // Regular feed
      prisma.post.findMany({
        where: { postType: { not: "LIVE" } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          comments: { where: { parentId: null }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, userEmail: true } },
          media: { orderBy: { order: "asc" }, select: { type: true, url: true, order: true } },
        },
      }),
    ]);

    const posts = [...livePosts, ...feedPosts];

    const emails = [...new Set(posts.map((p) => p.userEmail).filter(Boolean))] as string[];

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

    const profileByEmail = Object.fromEntries(profileRows.map((p) => [p.email, p]));
    const creatorByEmail = Object.fromEntries(creatorRows.map((c) => [c.email, c]));

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

      // Live stream data if present
      const live = (p as any).liveStream ?? null;

      return {
        id: p.id,
        postType: p.postType,
        caption: p.caption,
        imageUrl: sanitizeImageUrl(p.imageUrl),
        cloudflareVideoId: p.cloudflareVideoId ?? null,
        muxPlaybackId: p.muxPlaybackId ?? null,
        media: p.media?.map((m) => ({
          type: m.type,
          url: m.type === "IMAGE" ? sanitizeImageUrl(m.url) : m.url,
          order: m.order,
        })) ?? [],
        userEmail: p.userEmail,
        handle,
        avatarUrl: avatarUrl ? sanitizeImageUrl(avatarUrl) : null,
        displayName,
        createdAt: p.createdAt,
        latestComment,
        ringTier,
        voltage: p.voltage ?? 0,
        // Live fields
        isLive: p.postType === "LIVE" && (live?.status === "ACTIVE" || (!!(p as any).ivsPlaybackUrl && !(p as any).liveEndedAt)),
        liveStreamId: live?.id ?? null,
        livePlaybackId: live?.muxPlaybackId ?? null,
        ivsPlaybackUrl: (p as any).ivsPlaybackUrl ?? null,
        liveStartedAt: live?.liveStartedAt ?? null,
      };
    });

    return NextResponse.json({ posts: formatted }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20" },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || "Failed to fetch posts" }, { status: 500 });
  }
}