export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { normalizeEmail, isDmEnabled } from "@/lib/dm";

// GET /api/messages/unread-count
// Total unread messages across my conversations, for the top-bar inbox badge.
export async function GET() {
  if (!isDmEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  try {
    const mine = await prisma.conversationParticipant.findMany({
      where: { userEmail: me },
      select: { conversationId: true, lastReadAt: true },
    });

    const counts = await Promise.all(
      mine.map((p) =>
        prisma.message.count({
          where: {
            conversationId: p.conversationId,
            deletedAt: null,
            senderEmail: { not: me },
            ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
          },
        })
      )
    );

    const count = counts.reduce((sum, n) => sum + n, 0);
    return NextResponse.json({ count });
  } catch (err) {
    console.error("GET /api/messages/unread-count error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
