import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailFromCreatorMe } from "@/lib/authedEmail";

export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailFromCreatorMe(req);
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const creator = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    const post = await prisma.post.create({
      data: {
        creatorEmail: email,
        userEmail: email,
        type: "LIVE",
        caption: `${email.split("@")[0]} is live`,
        voltage: 500,
        liveStartedAt: new Date(),
        imageUrl: "",
      },
    });

    return NextResponse.json({
      streamId: post.id,
      playbackUrl: process.env.IVS_PLAYBACK_URL,
    });
  } catch (err: any) {
    console.error("create-ivs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
