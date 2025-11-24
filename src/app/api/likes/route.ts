// src/app/api/likes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/likes  -> like a post
export async function POST(req: Request) {
  try {
    const { postId, userEmail } = await req.json();

    if (!postId || !userEmail) {
      return NextResponse.json(
        { message: "postId and userEmail are required" },
        { status: 400 }
      );
    }

    try {
      await prisma.like.create({
        data: {
          postId,
          userEmail,
        },
      });
    } catch (err: any) {
      // Unique constraint (postId, userEmail) – user already liked this post
      if (err?.code === "P2002") {
        // Just ignore – we don't want to error in the UI
        return NextResponse.json(
          { message: "Already liked" },
          { status: 200 }
        );
      }
      throw err;
    }

    // Return the updated like count
    const likesCount = await prisma.like.count({ where: { postId } });

    return NextResponse.json(
      { postId, likesCount },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/likes error:", err);
    return NextResponse.json(
      { message: "Failed to like post" },
      { status: 500 }
    );
  }
}
