import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailOrNull();
    if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { battleId, streamId } = await req.json();
    if (!battleId || !streamId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const battle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    if (battle.status !== "pending") return NextResponse.json({ error: "Battle already started" }, { status: 409 });
    if (battle.creatorEmailA === email) return NextResponse.json({ error: "Cannot join your own battle" }, { status: 400 });

    const updated = await prisma.liveBattle.update({
      where: { id: battleId },
      data: {
        streamIdB: streamId,
        creatorEmailB: email,
        status: "active",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, battle: updated });
  } catch (e: any) {
    console.error("[battle/join]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}