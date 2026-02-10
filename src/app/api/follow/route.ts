import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // incoming payload (UI/API)
    const viewerEmail = String(body?.viewerEmail ?? "").trim().toLowerCase();
    const targetEmail = String(body?.targetEmail ?? "").trim().toLowerCase();
    const action = String(body?.action ?? "").trim().toLowerCase();

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ ok: false, error: "same_user" }, { status: 400 });
    }
    if (action !== "follow" && action !== "unfollow") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    // DB/Prisma Client expects followerEmail/followingEmail right now
    const followerEmail = viewerEmail;
    const followingEmail = targetEmail;

    const where = {
      uniq_follow_pair: { followerEmail, followingEmail },
    };

    if (action === "follow") {
      await (prisma as any).follow.upsert({
        where,
        update: {},
        create: { followerEmail, followingEmail },
        select: { id: true },
      });

      return NextResponse.json({ ok: true });
    }

    await (prisma as any).follow.delete({ where }).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/follow error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
