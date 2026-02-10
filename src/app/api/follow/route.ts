import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

async function findExisting(viewerEmail: string, targetEmail: string) {
  // Try viewer/target
  try {
    const row = await (prisma as any).follow.findFirst({
      where: { viewerEmail, targetEmail },
      select: { id: true },
    });
    if (row?.id) return row;
  } catch {}

  // Try follower/following
  try {
    const row = await (prisma as any).follow.findFirst({
      where: { followerEmail: viewerEmail, followingEmail: targetEmail },
      select: { id: true },
    });
    if (row?.id) return row;
  } catch {}

  return null;
}

async function createFollow(viewerEmail: string, targetEmail: string) {
  // Try viewer/target
  try {
    return await (prisma as any).follow.create({
      data: { viewerEmail, targetEmail },
      select: { id: true },
    });
  } catch (e1) {
    // Try follower/following
    return await (prisma as any).follow.create({
      data: { followerEmail: viewerEmail, followingEmail: targetEmail },
      select: { id: true },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const viewerEmail = normEmail((body as any)?.viewerEmail);
    const targetEmail = normEmail((body as any)?.targetEmail);
    const action = String((body as any)?.action ?? "").trim().toLowerCase();

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ ok: false, error: "same_user" }, { status: 400 });
    }
    if (action !== "follow" && action !== "unfollow") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    const existing = await findExisting(viewerEmail, targetEmail);

    if (action === "follow") {
      if (!existing) await createFollow(viewerEmail, targetEmail);
      return NextResponse.json({ ok: true });
    }

    // unfollow
    if (existing?.id) {
      await (prisma as any).follow.delete({ where: { id: existing.id } }).catch(() => null);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/follow error:", e);
    // return the real error so we can see what it is in curl/network
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: e?.message,
        prisma: e?.code ? { code: e.code, meta: e.meta } : undefined,
      },
      { status: 500 }
    );
  }
}
