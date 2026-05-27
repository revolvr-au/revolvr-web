import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailOrNull();
    if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { streamId } = await req.json();
    if (!streamId) return NextResponse.json({ error: "Missing streamId" }, { status: 400 });

    const battle = await prisma.liveBattle.create({
      data: {
        streamIdA: streamId,
        creatorEmailA: email,
        status: "pending",
        battleType: "circuit",
      },
    });

    return NextResponse.json({ ok: true, battleId: battle.id });
  } catch (e: any) {
    console.error("[battle/create]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}