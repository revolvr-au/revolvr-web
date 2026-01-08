import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LikeBody = {
  postId?: string;
  userEmail?: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function getPrismaCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null;
  if (!("code" in err)) return null;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as LikeBody;
    const postId = body.postId?.trim();
    const userEmail = body.userEmail?.trim().toLowerCase();

    if (!postId || !userEmail) {
      return jsonError("postId and userEmail are required", 400);
    }

    try {
      await prisma.like.create({
        data: { postId, userEmail },
      });
    } catch (err: unknown) {
      if (getPrismaCode(err) !== "P2002") {
        console.error("POST /api/likes error:", errorMessage(err));
        return jsonError("Failed to like post", 500);
      }
    }

    const count = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ likesCount: count }, { status: 200 });
  } catch (err: unknown) {
    console.error("POST /api/likes error:", errorMessage(err));
    return jsonError("Failed to like post", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as LikeBody;
    const postId = body.postId?.trim();
    const userEmail = body.userEmail?.trim().toLowerCase();

    if (!postId || !userEmail) {
      return jsonError("postId and userEmail are required", 400);
    }

    await prisma.like.deleteMany({ where: { postId, userEmail } });

    const count = await prisma.like.count({ where: { postId } });
    return NextResponse.json({ likesCount: count }, { status: 200 });
  } catch (err: unknown) {
    console.error("DELETE /api/likes error:", errorMessage(err));
    return jsonError("Failed to unlike post", 500);
  }
}
