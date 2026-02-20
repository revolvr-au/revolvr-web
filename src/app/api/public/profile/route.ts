import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = (url.searchParams.get("handle") || "").trim().toLowerCase();

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  try {
    // 1) Find creator profile by handle
    const creator = await prisma.creatorProfile.findUnique({
      where: { handle },
      select: {
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
      },
    });

    if (!creator || !creator.email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 2) Fetch posts by email (Post.userEmail)
    const posts = await prisma.post.findMany({
      where: { userEmail: creator.email },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
      },
      take: 60,
    });

    // 3) Followers/following counts
    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({
        where: { followingEmail: creator.email },
      }),
      prisma.follow.count({
        where: { followerEmail: creator.email },
      }),
    ]);

    return NextResponse.json({
      profile: {
        email: creator.email,
        displayName: creator.displayName ?? creator.handle ?? creator.email,
        handle: creator.handle ?? "",
        avatarUrl: creator.avatarUrl,
        bio: creator.bio,
        followersCount,
        followingCount,
        isVerified: creator.isVerified ?? false,
      },
      posts,
    });
  } catch (err) {
    console.error("[api/public/profile] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}