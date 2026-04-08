import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET posts
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // ✅ map DB → frontend shape
    const formatted = posts.map((p) => ({
  id: p.id,
  caption: p.caption,
  imageUrl: p.imageUrl, // ✅ THIS FIXES EVERYTHING
  userEmail: p.userEmail,
  createdAt: p.createdAt,
}));

    return NextResponse.json({ posts: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

// POST create
export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("POST BODY:", body); // 👈 debug (important)

    if (!body.media_url) {
      return NextResponse.json(
        { error: "media_url missing" },
        { status: 400 }
      );
    }

    if (!body.userEmail) {
      return NextResponse.json(
        { error: "userEmail missing" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
  data: {
    caption: body.caption || "",
    imageUrl: body.media_url, // ✅ FIX
    userEmail: body.userEmail,
  },
});

    return NextResponse.json({ post });

  } catch (err: any) {
    console.error("POST ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create post" },
      { status: 500 }
    );
  }
}