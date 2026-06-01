export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import {
  assertParticipant,
  assertNotMinor,
  normalizeEmail,
  MinorBlockedError,
  NotParticipantError,
} from "@/lib/dm";

type RouteContext = { params: Promise<{ conversationId: string }> };

const PAGE_SIZE = 30;
const MAX_BODY_LEN = 4000;

// GET /api/messages/[conversationId]/messages
//   ?before=<ISO createdAt>  → older history (pagination), newest page first
//   ?after=<ISO createdAt>   → newer messages since a cursor (reconnect reconcile)
// Always returns `messages` chronological (oldest-first).
export async function GET(req: Request, ctx: RouteContext) {
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  try {
    const { conversationId } = await ctx.params;
    await assertParticipant(conversationId, me);

    const params = new URL(req.url).searchParams;
    const beforeRaw = params.get("before");
    const afterRaw = params.get("after");
    const before = beforeRaw ? new Date(beforeRaw) : null;
    const after = afterRaw ? new Date(afterRaw) : null;
    const useAfter = after && !isNaN(after.getTime());

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(useAfter ? { createdAt: { gt: after! } } : {}),
        ...(before && !isNaN(before.getTime()) ? { createdAt: { lt: before } } : {}),
      },
      // For `after`, take the oldest-newer first so a full page starts right after
      // the cursor; otherwise take the newest first for history paging.
      orderBy: { createdAt: useAfter ? "asc" : "desc" },
      take: PAGE_SIZE,
    });

    return NextResponse.json({
      messages: useAfter ? messages : messages.slice().reverse(),
      hasMore: messages.length === PAGE_SIZE,
    });
  } catch (err) {
    if (err instanceof NotParticipantError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    console.error("GET /api/messages/[conversationId]/messages error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST /api/messages/[conversationId]/messages  { body }
export async function POST(req: Request, ctx: RouteContext) {
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  try {
    const { conversationId } = await ctx.params;
    await assertParticipant(conversationId, me);

    const payload = await req.json().catch(() => ({}));
    const text = String(payload?.body ?? "").trim();
    if (!text) return NextResponse.json({ error: "empty_body" }, { status: 400 });
    if (text.length > MAX_BODY_LEN) {
      return NextResponse.json({ error: "body_too_long" }, { status: 400 });
    }

    // Cheap re-check: reject if any participant is a minor.
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userEmail: true },
    });
    await assertNotMinor(...participants.map((p) => p.userEmail));

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId, senderEmail: me, body: text, type: "TEXT" },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: created.createdAt },
      });
      return created;
    });

    // The AFTER INSERT trigger (broadcast_dm_message) fans this out to the
    // 'conversation:<id>' private channel automatically.
    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof NotParticipantError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    if (err instanceof MinorBlockedError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    console.error("POST /api/messages/[conversationId]/messages error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
