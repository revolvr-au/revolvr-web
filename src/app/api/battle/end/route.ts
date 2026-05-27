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

    const { battleId } = await req.json();
    if (!battleId) return NextResponse.json({ error: "Missing battleId" }, { status: 400 });

    const battle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    if (!battle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const winnerEmail = (battle.voltageA ?? 0) >= (battle.voltageB ?? 0)
      ? battle.creatorEmailA
      : battle.creatorEmailB;

    const updated = await prisma.liveBattle.update({
      where: { id: battleId },
      data: { status: "ended", endedAt: new Date(), winnerEmail },
    });

    // Broadcast end to both streams
    const payload = {
      battleId,
      winnerEmail,
      voltageA: battle.voltageA,
      voltageB: battle.voltageB,
    };

    await supabaseAdmin.channel(`battle:${battleId}`).send({
      type: "broadcast", event: "battle_ended", payload,
    });
    if (battle.streamIdA) {
      await supabaseAdmin.channel(`live:${battle.streamIdA}`).send({
        type: "broadcast", event: "battle_ended", payload,
      });
    }
    if (battle.streamIdB) {
      await supabaseAdmin.channel(`live:${battle.streamIdB}`).send({
        type: "broadcast", event: "battle_ended", payload,
      });
    }

    return NextResponse.json({ ok: true, winnerEmail });
  } catch (e: any) {
    console.error("[battle/end]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}