export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();

    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400 },
      );
    }

    const now = new Date();

    const active = await prisma.trancheEvent.findFirst({
      where: {
        commentAuthorEmail: email,
        status: "SIN_BIN",
        sinBinExpiresAt: { gt: now },
      },
      orderBy: [{ sinBinLevel: "desc" }, { sinBinExpiresAt: "desc" }],
      select: {
        id: true,
        sinBinLevel: true,
        sinBinExpiresAt: true,
      },
    });

    if (active) {
      return NextResponse.json({
        ok: true,
        active: true,
        level: active.sinBinLevel,
        expiresAt: active.sinBinExpiresAt,
        eventId: active.id,
      });
    }

    const struckOut = await prisma.trancheEvent.findFirst({
      where: {
        commentAuthorEmail: email,
        status: "STRUCK_OUT",
      },
      orderBy: { struckOutAt: "desc" },
      select: { id: true, struckOutAt: true },
    });

    if (struckOut) {
      return NextResponse.json({
        ok: true,
        active: true,
        level: 3,
        struckOut: true,
        struckOutAt: struckOut.struckOutAt,
        eventId: struckOut.id,
      });
    }

    return NextResponse.json({ ok: true, active: false, level: 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    console.error("tranche/sin-bin/status error", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
