export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import {
  assertNotMinor,
  directKeyFor,
  normalizeEmail,
  isDmEnabled,
  MinorBlockedError,
} from "@/lib/dm";

// GET /api/messages/conversations
// Inbox: my conversations ordered by lastMessageAt desc, each with the other
// participant, the last (non-deleted) message preview, and my unread count.
export async function GET() {
  if (!isDmEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  try {
    const convos = await prisma.conversation.findMany({
      where: { participants: { some: { userEmail: me } } },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      include: {
        participants: true,
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Batch-resolve display names / avatars for the "other" participants.
    const otherEmails = [
      ...new Set(
        convos
          .map((c) => c.participants.find((p) => p.userEmail !== me)?.userEmail)
          .filter((e): e is string => Boolean(e))
      ),
    ];
    const profileRows = otherEmails.length
      ? await prisma.profiles.findMany({
          where: { email: { in: otherEmails } },
          select: { email: true, display_name: true, avatar_url: true },
        })
      : [];
    const profileByEmail = new Map(profileRows.map((p) => [p.email, p]));

    const conversations = await Promise.all(
      convos.map(async (c) => {
        const mine = c.participants.find((p) => p.userEmail === me);
        const other = c.participants.find((p) => p.userEmail !== me);
        const lastMessage = c.messages[0] ?? null;

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: c.id,
            deletedAt: null,
            senderEmail: { not: me },
            ...(mine?.lastReadAt ? { createdAt: { gt: mine.lastReadAt } } : {}),
          },
        });

        const prof = other ? profileByEmail.get(other.userEmail) : undefined;

        return {
          id: c.id,
          lastMessageAt: c.lastMessageAt,
          muted: mine?.muted ?? false,
          other: other
            ? {
                email: other.userEmail,
                displayName: prof?.display_name ?? null,
                avatarUrl: prof?.avatar_url ?? null,
              }
            : null,
          lastMessage: lastMessage
            ? {
                body: lastMessage.body,
                senderEmail: lastMessage.senderEmail,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("GET /api/messages/conversations error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST /api/messages/conversations  { targetEmail }
// Resolve-or-create the 1:1 conversation between me and targetEmail.
export async function POST(req: Request) {
  if (!isDmEnabled()) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const meRaw = await getAuthedEmailOrNull();
  if (!meRaw) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = normalizeEmail(meRaw);

  let directKey: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const target = normalizeEmail(String(body?.targetEmail ?? ""));

    if (!target || !target.includes("@")) {
      return NextResponse.json({ error: "invalid_target" }, { status: 400 });
    }
    if (target === me) {
      return NextResponse.json({ error: "cannot_dm_self" }, { status: 400 });
    }

    // Target must be a real user (profile or creator profile) to avoid phantom threads.
    const [prof, creator] = await Promise.all([
      prisma.profiles.findUnique({ where: { email: target }, select: { email: true } }),
      prisma.creatorProfile.findUnique({ where: { email: target }, select: { email: true } }),
    ]);
    if (!prof && !creator) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    // Symmetric minor block (app-level). The DB trigger is the backstop.
    await assertNotMinor(me, target);

    directKey = directKeyFor(me, target);

    const existing = await prisma.conversation.findUnique({
      where: { directKey },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ conversationId: existing.id, created: false });
    }

    const conversation = await prisma.$transaction(async (tx) => {
      return tx.conversation.create({
        data: {
          type: "DIRECT",
          directKey,
          participants: {
            create: [{ userEmail: me }, { userEmail: target }],
          },
        },
        select: { id: true },
      });
    });

    return NextResponse.json({ conversationId: conversation.id, created: true });
  } catch (err) {
    if (err instanceof MinorBlockedError) {
      return NextResponse.json({ error: err.code }, { status: 403 });
    }
    // Unique-constraint race on directKey → fetch the winner.
    if (
      directKey &&
      typeof err === "object" &&
      err &&
      (err as { code?: string }).code === "P2002"
    ) {
      const existing = await prisma.conversation.findUnique({
        where: { directKey },
        select: { id: true },
      });
      if (existing) return NextResponse.json({ conversationId: existing.id, created: false });
    }
    console.error("POST /api/messages/conversations error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
