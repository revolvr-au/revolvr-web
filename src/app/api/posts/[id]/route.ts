// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/posts  -> list all posts with like counts
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          // 👈 use "Like" (relation name) not "likes"
          select: { Like: true },
        },
      },
    });

    const payload = posts.map((p) => ({
      id: p.id,
      userEmail: p.userEmail,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likesCount: p._count.Like, // number of likes
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
    const { caption, imageUrl, userEmail, mediaType } = body;

    const mt = mediaType === "video" ? "video" : "image";

    if (!imageUrl || !userEmail) {
      return NextResponse.json(
        { message: "imageUrl and userEmail are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        caption: typeof caption === "string" ? caption : "",
        imageUrl: String(imageUrl),
        userEmail: String(userEmail).trim().toLowerCase(),
        mediaType: mt,
      },
    });

    return NextResponse.json({ ...post, likesCount: 0 }, { status: 201 });
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json({ message: "Failed to create post" }, { status: 500 });
  }
}

