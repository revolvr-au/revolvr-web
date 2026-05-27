export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trancheCopyFor } from "@/lib/notificationCopy";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const viewerEmail = (searchParams.get("viewerEmail") ?? "").trim().toLowerCase();

    if (!viewerEmail) {
      return NextResponse.json({ ok: true, notifications: [] });
    }

    const rows = await prisma.trancheNotification.findMany({
      where: { recipientEmail: viewerEmail },
      orderBy: { sentAt: "desc" },
      take: 100,
      include: {
        trancheEvent: {
          select: { id: true, commentId: true, postId: true, gathId: true },
        },
      },
    });

    const notifications = rows.map((n) => ({
      id: n.id,
      type: n.type,
      copy: trancheCopyFor(n.type),
      isRead: n.isRead,
      sentAt: n.sentAt,
      trancheEventId: n.trancheEventId,
      commentId: n.trancheEvent?.commentId ?? null,
      postId: n.trancheEvent?.postId ?? null,
      gathId: n.trancheEvent?.gathId ?? null,
      metadata: n.metadata,
    }));

    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    console.error("🔥 GET /api/notifications ERROR:", error);
    return NextResponse.json({ ok: false, notifications: [] }, { status: 500 });
  }
}
