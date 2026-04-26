import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardVoltage } from "@/lib/serverVoltage";

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

    if (!body.userEmail) {
      return NextResponse.json(
        { error: "userEmail missing" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        caption: body.caption || "",
        imageUrl: body.media_url || "",
        userEmail: body.userEmail,
        cloudflareVideoId: body.cloudflareVideoId ?? null,
        muxPlaybackId: body.muxPlaybackId ?? null,
      },
    });
const email = body.userEmail;

await awardVoltage({
  creatorEmail: email,
  eventType: "post_created",
  actorEmail: email,
  targetType: "post",
  targetId: post.id,
  dedupeKey: `post:${post.id}`,
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