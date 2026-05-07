import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIFT_COSTS: Record<string, number> = {
  pulse:    10,
  amp:      50,
  override: 150,
  monolith: 500,
  eclipse:  1500,
};

const RING_PAYOUT: Record<string, number> = {
  NONE:      0.18,
  BLUE:      0.30,
  GOLD:      0.50,
  BUSINESS:  0.65,
  CORPORATE: 0.65,
};

const CENTS_PER_SPARK = 2.99 / 100;
const TAX_WITHHOLD_RATE = 0.10;

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

    const ringTier = creator?.ringTier ?? "NONE";
    const payoutRate = RING_PAYOUT[ringTier] ?? 0.18;
    const grossCents = Math.round(sparkCost * CENTS_PER_SPARK * 100);
    const creatorGrossCents = Math.round(grossCents * payoutRate);
    const taxReserveCents = Math.round(creatorGrossCents * TAX_WITHHOLD_RATE);
    const creatorNetCents = creatorGrossCents - taxReserveCents;
    const platformCents = grossCents - creatorGrossCents;
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
          totalEarnedCents: { increment: creatorNetCents },
          availableCents: { increment: creatorNetCents },
        },
        create: {
          creatorEmail,
          totalEarnedCents: creatorNetCents,
          availableCents: creatorNetCents,
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
          creatorCents: creatorNetCents,
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

    return NextResponse.json({ ok: true, voltageGain });

  } catch (e: any) {
    console.error("[battle/gift]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}