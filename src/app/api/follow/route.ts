import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

async function findRow(viewerEmail: string, target: string) {
  // Try viewerEmail + targetEmail
  try {
    const row = await (prisma as any).follow.findFirst({
      where: { viewerEmail, targetEmail: target },
      select: { id: true },
    });
    if (row?.id) return row;
  } catch {}

  // Try viewerEmail + followingEmail
  try {
    const row = await (prisma as any).follow.findFirst({
      where: { viewerEmail, followingEmail: target },
      select: { id: true },
    });
    if (row?.id) return row;
  } catch {}

  return null;
}

async function createRow(viewerEmail: string, target: string) {
  // Try viewerEmail + targetEmail
  try {
    return await (prisma as any).follow.create({
      data: { viewerEmail, targetEmail: target },
      select: { id: true },
    });
  } catch {}

  // Try viewerEmail + followingEmail
  return await (prisma as any).follow.create({
    data: { viewerEmail, followingEmail: target },
    select: { id: true },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const viewerEmail = norm((body as any)?.viewerEmail);
    const targetEmail = norm((body as any)?.targetEmail);
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

    const existing = await findRow(viewerEmail, targetEmail);

    if (action === "follow") {
      if (!existing) {
        // If unique constraint exists, a race can throw P2002; treat it as ok.
        await createRow(viewerEmail, targetEmail).catch((e: any) => {
          if (e?.code === "P2002") return null;
          throw e;
        });
      }
      return NextResponse.json({ ok: true });
    }

    // unfollow
    if (existing?.id) {
      await (prisma as any).follow.delete({ where: { id: existing.id } }).catch(() => null);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/follow error:", e);
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
