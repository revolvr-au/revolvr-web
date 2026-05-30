export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { assertParticipant, normalizeEmail, NotParticipantError } from "@/lib/dm";

type RouteContext = { params: Promise<{ conversationId: string }> };

// POST /api/messages/[conversationId]/read
// Mark the conversation read up to now for the current user (clears unread badge).
export async function POST(_req: Request, ctx: RouteContext) {
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  try {
    const { conversationId } = await ctx.params;
    await assertParticipant(conversationId, me);

    await prisma.conversationParticipant.update({
      where: { conversationId_userEmail: { conversationId, userEmail: me } },
      data: { lastReadAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof NotParticipantError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    console.error("POST /api/messages/[conversationId]/read error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
