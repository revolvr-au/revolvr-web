import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MediaItem = {
  type: "IMAGE" | "VIDEO";
  url: string;
  order: number;
};

// POST /api/posts/[id]/media — attach media items to an existing post
export async function POST(req: Request, { params }: { params: any }) {
  try {
    const postId = String(params?.id ?? "").trim();
    if (!postId) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const body = await req.json();
    const items: MediaItem[] = body.media;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "media array required" }, { status: 400 });
    }

    const created = await prisma.postMedia.createMany({
      data: items.map((item) => ({
        postId,
        type: item.type,
        url: item.url,
        order: item.order,
      })),
    });

    // Surface the first item on the Post itself for feed compatibility
    const first = items[0];
    await prisma.post.update({
      where: { id: postId },
      data: {
        imageUrl: first.type === "IMAGE" ? first.url : "",
        muxPlaybackId: first.type === "VIDEO" ? first.url : null,
      },
    });

    return NextResponse.json({ count: created.count });
  } catch (err: any) {
    console.error("POST /api/posts/[id]/media error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save media" },
      { status: 500 }
    );
  }
}
