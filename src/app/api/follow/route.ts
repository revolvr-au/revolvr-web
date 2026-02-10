import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const viewerEmail = String(body?.viewerEmail ?? "").trim().toLowerCase();
    const targetEmail = String(body?.targetEmail ?? "").trim().toLowerCase();
    const action = String(body?.action ?? "").trim().toLowerCase();

    if (!viewerEmail || !targetEmail || viewerEmail === targetEmail) {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }

    if (action === "follow") {
      await prisma.follow.upsert({
        where: {
          follower_following: {
            followerEmail: viewerEmail,
            followingEmail: targetEmail,
          },
        },
        update: {},
        create: {
          followerEmail: viewerEmail,
          followingEmail: targetEmail,
        },
      });

      return NextResponse.json({ ok: true, following: true });
    }

    if (action === "unfollow") {
      await prisma.follow.deleteMany({
        where: {
          followerEmail: viewerEmail,
          followingEmail: targetEmail,
        },
      });

      return NextResponse.json({ ok: true, following: false });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/follow error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
