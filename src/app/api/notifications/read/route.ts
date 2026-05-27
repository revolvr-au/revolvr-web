export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const viewerEmail = String(body?.viewerEmail ?? "").trim().toLowerCase();
    const ids = Array.isArray(body?.ids)
      ? (body.ids as unknown[]).filter((x): x is string => typeof x === "string")
      : null;

    if (!viewerEmail) {
      return NextResponse.json({ ok: false, error: "viewerEmail required" }, { status: 400 });
    }

    const result = await prisma.trancheNotification.updateMany({
      where: {
        recipientEmail: viewerEmail,
        isRead: false,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
      },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error("🔥 POST /api/notifications/read ERROR:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
