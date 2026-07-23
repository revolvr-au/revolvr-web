import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardVoltage } from "@/lib/serverVoltage";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

// GET posts
export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      where: { deletedAt: null },
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
    const authed = await getAuthedEmailOrNull();
    if (!authed) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const email = authed.trim().toLowerCase();

    const body = await req.json();

    console.log("POST BODY:", body); // 👈 debug (important)

    const post = await prisma.post.create({
      data: {
        caption: body.caption || "",
        imageUrl: body.media_url || "",
        userEmail: email,
        cloudflareVideoId: body.cloudflareVideoId ?? null,
        muxPlaybackId: body.muxPlaybackId ?? null,
      },
    });

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