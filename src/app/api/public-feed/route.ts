import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
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
        select: { email: true, handle: true, displayName: true, avatarUrl: true },
      }),
    ]);

    const profileByEmail = Object.fromEntries(
      profileRows.map((p) => [p.email, p])
    );
    const creatorByEmail = Object.fromEntries(
      creatorRows.map((c) => [c.email, c])
    );

    const formatted = posts.map((p) => {
      const email = p.userEmail ?? "";
      const profile = profileByEmail[email];
      const creator = creatorByEmail[email];

      const handle = creator?.handle?.trim() || email.split("@")[0] || "user";
      const avatarUrl = profile?.avatar_url ?? creator?.avatarUrl ?? null;
      const displayName = profile?.display_name?.trim() || creator?.displayName?.trim() || handle;

      return {
        id: p.id,
        caption: p.caption,
        imageUrl: p.imageUrl,
        handle,
        avatarUrl,
        displayName,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({ posts: formatted });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
