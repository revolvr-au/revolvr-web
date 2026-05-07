import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailOrNull();
    if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { streamId } = await req.json();
    if (!streamId) return NextResponse.json({ error: "Missing streamId" }, { status: 400 });

    // Look for an open battle seeking a challenger (not created by this user)
    const openBattle = await prisma.liveBattle.findFirst({
      where: {
        status: "seeking",
        creatorEmailA: { not: email },
      },
      orderBy: { createdAt: "asc" },
    });

    if (openBattle) {
      // Join existing battle
      const now = new Date();
      const battle = await prisma.liveBattle.update({
        where: { id: openBattle.id },
        data: {
          streamIdB: streamId,
          creatorEmailB: email,
          status: "active",
          startedAt: now,
          timerStartedAt: now,
        },
      });

      // Broadcast to both creators — battle is starting
      await supabaseAdmin.channel(`live:${openBattle.streamIdA}`).send({
        type: "broadcast",
        event: "battle_matched",
        payload: { battleId: battle.id, side: "A" },
      });
      await supabaseAdmin.channel(`live:${streamId}`).send({
        type: "broadcast",
        event: "battle_matched",
        payload: { battleId: battle.id, side: "B" },
      });

      return NextResponse.json({ ok: true, status: "matched", battleId: battle.id, side: "B" });
    }

    // No open battle — create one and wait
    const battle = await prisma.liveBattle.create({
      data: {
        streamIdA: streamId,
        creatorEmailA: email,
        status: "seeking",
        battleType: "circuit",
      },
    });

    return NextResponse.json({ ok: true, status: "seeking", battleId: battle.id, side: "A" });

  } catch (e: any) {
    console.error("[battle/seek]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}