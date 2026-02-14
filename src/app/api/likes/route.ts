import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { postId, userEmail } = await req.json();

    if (!postId || !userEmail) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(userEmail).trim().toLowerCase();

    // Check existing like using composite unique key
    const existing = await prisma.like.findUnique({
      where: {
        postId_userEmail: {
          postId,
          userEmail: normalizedEmail,
        },
      },
    });

    if (existing) {
      await prisma.like.delete({
        where: {
          postId_userEmail: {
            postId,
            userEmail: normalizedEmail,
          },
        },
      });

      const likeCount = await prisma.like.count({
        where: { postId },
      });

      return NextResponse.json({
        ok: true,
        liked: false,
        likeCount,
      });
    }

    await prisma.like.create({
      data: {
        postId,
        userEmail: normalizedEmail,
      },
    });

    const likeCount = await prisma.like.count({
      where: { postId },
    });

    return NextResponse.json({
      ok: true,
      liked: true,
      likeCount,
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "duplicate_like" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "like_failed" },
      { status: 500 }
    );
  }
}
