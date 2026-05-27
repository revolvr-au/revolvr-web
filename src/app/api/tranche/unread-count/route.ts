export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerEmail = (searchParams.get("viewerEmail") ?? "").trim().toLowerCase();

    if (!viewerEmail) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const count = await prisma.trancheNotification.count({
      where: { recipientEmail: viewerEmail, isRead: false },
    });

    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error("🔥 GET /api/tranche/unread-count ERROR:", error);
    return NextResponse.json({ ok: false, count: 0 }, { status: 500 });
  }
}
