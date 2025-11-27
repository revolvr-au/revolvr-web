// src/app/api/likes/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickSpinnerOutcome } from "@/lib/spinner"; // for the spinner route

// POST /api/likes  -> like a post
export async function POST(req: Request) {
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

    // create like (ignore if already exists)
    try {
      await prisma.like.create({
        data: {
          postId,
          userEmail,
        },
      });
    } catch (err: any) {
      // unique constraint violation -> already liked, we just ignore
      if (err.code !== "P2002") {
        console.error("POST /api/likes error:", err);
        return NextResponse.json(
          { message: "Failed to like post" },
          { status: 500 }
        );
      }
    }

    // return updated like count
    const count = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({ likesCount: count });
  } catch (err) {
    console.error("POST /api/likes error:", err);
    return NextResponse.json(
      { message: "Failed to like post" },
      { status: 500 }
    );
  }
}

// DELETE /api/likes  -> unlike a post
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

    await prisma.like.deleteMany({
      where: { postId, userEmail },
    });

    const count = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({ likesCount: count });
  } catch (err) {
    console.error("DELETE /api/likes error:", err);
    return NextResponse.json(
      { message: "Failed to unlike post" },
      { status: 500 }
    );
  }
}
