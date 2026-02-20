import { NextResponse } from "next/server";

// Adjust this import to your project.
// Usually you have something like: import { prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const handle = (url.searchParams.get("handle") || "").trim();

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  // ✅ IMPORTANT:
  // Replace model/field names below to match your Prisma schema.
  // I’m assuming: user.handle, user.email, user.displayName, user.avatarUrl, user.bio
  // and posts are in prisma.post with authorHandle or authorId.
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      email: true,
      displayName: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      followersCount: true,
      followingCount: true,
      isVerified: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const posts = await prisma.post.findMany({
    where: { authorHandle: handle }, // <- adjust if you store authorId/email instead
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      createdAt: true,
    },
    take: 60,
  });

  return NextResponse.json({ profile: user, posts });
}