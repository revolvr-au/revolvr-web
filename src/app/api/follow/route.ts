import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const viewerEmail = norm((body as any)?.viewerEmail);
    const targetEmail = norm((body as any)?.targetEmail);
    const action = norm((body as any)?.action);

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ ok: false, error: "same_user" }, { status: 400 });
    }
    if (action !== "follow" && action !== "unfollow") {
      return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }

    if (action === "follow") {
      await prisma.follow
        .create({
          data: { viewerEmail, targetEmail },
          select: { id: true },
        })
        .catch((e: any) => {
          if (e?.code === "P2002") return null; // already exists
          throw e;
        });

      return NextResponse.json({ ok: true });
    }

    await prisma.follow.deleteMany({ where: { viewerEmail, targetEmail } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/follow error:", e);
    return NextResponse.json(
      { ok: false, error: "server_error", message: e?.message, prisma: e?.code ? { code: e.code, meta: e.meta } : undefined },
      { status: 500 }
    );
  }
}
