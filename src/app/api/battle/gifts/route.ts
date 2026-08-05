import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";
import { payoutRateFor } from "@/lib/ringPayout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIFT_COSTS: Record<string, number> = {
  pulse:    10,
  amp:      50,
  override: 150,
  monolith: 500,
  eclipse:  1500,
};

const CENTS_PER_SPARK = 2.99 / 100;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const viewerEmail = await getAuthedEmailOrNull();
    if (!viewerEmail) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { giftId, battleId, side } = await req.json();
    if (!giftId || !battleId || !side) return NextResponse.json({ error: "Missing params" }, { status: 400 });
    if (side !== "A" && side !== "B") return NextResponse.json({ error: "Invalid side" }, { status: 400 });

    const sparkCost = GIFT_COSTS[giftId];
    if (!sparkCost) return NextResponse.json({ error: "Invalid gift" }, { status: 400 });

    // Check sparks
    const credits = await prisma.userCredits.findUnique({
      where: { email: viewerEmail },
      select: { sparks: true },
    });
    if (!credits || credits.sparks < sparkCost) {
      return NextResponse.json({ error: "insufficient_sparks" }, { status: 402 });
    }

    // Get battle
    const battle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });

    const creatorEmail = side === "A" ? battle.creatorEmailA : battle.creatorEmailB;
    if (!creatorEmail) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    // Get creator ring tier
    const creator = await prisma.creatorProfile.findUnique({
      where: { email: creatorEmail },
      select: { ringTier: true },
    });

    // The creator's full share is credited; Revolvr does not withhold tax on
    // their behalf.
    const payoutRate = payoutRateFor(creator?.ringTier);
    const grossCents = Math.round(sparkCost * CENTS_PER_SPARK * 100);
    const creatorCents = Math.round(grossCents * payoutRate);
    const platformCents = grossCents - creatorCents;
    const voltageGain = Math.ceil(sparkCost / 10);

    // Execute transaction
    await prisma.$transaction([
      prisma.userCredits.update({
        where: { email: viewerEmail },
        data: { sparks: { decrement: sparkCost } },
      }),
      prisma.creatorBalance.upsert({
        where: { creatorEmail },
        update: {
          totalEarnedCents: { increment: creatorCents },
          availableCents: { increment: creatorCents },
        },
        create: {
          creatorEmail,
          totalEarnedCents: creatorCents,
          availableCents: creatorCents,
          updatedAt: new Date(),
        },
      }),
      prisma.supportLedger.create({
        data: {
          creatorEmail,
          viewerEmail,
          kind: "GIFT",
          source: "LIVE",
          targetId: battleId,
          units: sparkCost,
          currency: "AUD",
          grossCents,
          creatorCents,
          platformCents,
        },
      }),
      // Update battle voltage
      prisma.liveBattle.update({
        where: { id: battleId },
        data: side === "A"
          ? { voltageA: { increment: voltageGain } }
          : { voltageB: { increment: voltageGain } },
      }),
    ]);

    // Broadcast voltage update to all viewers
    const updatedBattle = await prisma.liveBattle.findUnique({ where: { id: battleId } });
    await supabaseAdmin.channel(`battle:${battleId}`).send({
      type: "broadcast",
      event: "voltage",
      payload: {
        voltageA: updatedBattle?.voltageA ?? 0,
        voltageB: updatedBattle?.voltageB ?? 0,
      },
    });

    // Broadcast gift effect to all viewers
    await supabaseAdmin.channel(`battle:${battleId}`).send({
      type: "broadcast",
      event: "gift_effect",
      payload: {
        giftId,
        side,
        senderName: viewerEmail?.split("@")[0] ?? "viewer",
      },
    });

    return NextResponse.json({ ok: true, voltageGain });

  } catch (e: any) {
    console.error("[battle/gift]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}