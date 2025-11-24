// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/posts  -> all posts with like counts
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { likes: true },
        },
      },
    });

    const withCounts = posts.map((p) => ({
      id: p.id,
      userEmail: p.userEmail,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      likesCount: p._count.likes,
    }));

    return NextResponse.json(withCounts);
  } catch (err) {
    console.error("GET /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to load posts" },
      { status: 500 }
    );
  }
}

// POST /api/posts  -> create new post
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const caption = (body.caption ?? "").trim();
    const imageUrl = (body.imageUrl ?? "").trim();
    const userEmail = (body.userEmail ?? "").trim();

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

    // new posts start with 0 likes
    return NextResponse.json(
      { ...post, likesCount: 0 },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to create post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts  -> delete a post (and its likes)
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const postId = body.postId as string | undefined;
    const userEmail = body.userEmail as string | undefined;

    if (!postId || !userEmail) {
      return NextResponse.json(
        { message: "postId and userEmail are required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (post.userEmail !== userEmail) {
      return NextResponse.json(
        { message: "Not allowed to delete this post" },
        { status: 403 }
      );
    }

    // delete likes first, then post
    await prisma.like.deleteMany({ where: { postId } });
    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/posts error:", err);
    return NextResponse.json(
      { message: "Failed to delete post" },
      { status: 500 }
    );
  }
}
