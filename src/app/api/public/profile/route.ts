import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const handle = (url.searchParams.get("handle") || "").trim();

    if (!handle) {
      return NextResponse.json(
        { error: "Missing handle" },
        { status: 400 }
      );
    }

    // Find creator profile by handle
    const user = await prisma.creatorProfile.findUnique({
      where: { handle },
      select: {
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        bio: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch posts using email (because Post model uses userEmail)
    const posts = await prisma.post.findMany({
      where: { userEmail: user.email },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
      },
      take: 60,
    });

    return NextResponse.json({
      profile: user,
      posts,
    });
  } catch (error) {
    console.error("Profile API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}