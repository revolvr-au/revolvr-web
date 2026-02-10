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

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ ok: false, error: "same_user" }, { status: 400 });
    }

    // IMPORTANT:
    // Your Prisma unique compound key name may differ.
    // If tsc complains about `uniq_follow_pair`, change it to whatever your schema generates.
    const where = {
      uniq_follow_pair: { viewerEmail, targetEmail },
    } as any;

    if (action === "follow") {
      await prisma.follow.upsert({
        where,
        update: {},
        create: { viewerEmail, targetEmail } as any,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "unfollow") {
      await prisma.follow
        .delete({ where })
        .catch(() => null);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/follow error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
