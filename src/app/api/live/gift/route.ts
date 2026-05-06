import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Spark cost per gift
const GIFT_COSTS: Record<string, number> = {
  pulse:    10,
  amp:      50,
  override: 150,
  monolith: 500,
  eclipse:  1500,
};

// Payout % by ring tier (after platform fee)
const RING_PAYOUT: Record<string, number> = {
  NONE:      0.18,
  BLUE:      0.30,
  GOLD:      0.50,
  BUSINESS:  0.65,
  CORPORATE: 0.65,
};

// AUD cents per spark (100 sparks = $2.99 AUD)
const CENTS_PER_SPARK = 2.99 / 100;
const TAX_WITHHOLD_RATE = 0.10;

export async function POST(req: Request) {
  try {
    const viewerEmail = await getAuthedEmailOrNull();
    if (!viewerEmail) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const { giftId, streamId, creatorEmail } = await req.json();
    if (!giftId || !streamId || !creatorEmail) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const sparkCost = GIFT_COSTS[giftId];
    if (!sparkCost) {
      return NextResponse.json({ error: "Invalid gift" }, { status: 400 });
    }

    // 1. Check viewer has enough sparks
    const credits = await prisma.userCredits.findUnique({
      where: { email: viewerEmail },
      select: { sparks: true },
    });

    if (!credits || credits.sparks < sparkCost) {
      return NextResponse.json({ error: "insufficient_sparks" }, { status: 402 });
    }

    // 2. Get creator's ring tier for payout calculation
    const creator = await prisma.creatorProfile.findUnique({
      where: { email: creatorEmail },
      select: { ringTier: true, email: true },
    });

    const ringTier = creator?.ringTier ?? "NONE";
    const payoutRate = RING_PAYOUT[ringTier] ?? 0.18;

    // 3. Calculate split
    const grossCents = Math.round(sparkCost * CENTS_PER_SPARK * 100);
    const creatorGrossCents = Math.round(grossCents * payoutRate);
    const taxReserveCents = Math.round(creatorGrossCents * TAX_WITHHOLD_RATE);
    const creatorNetCents = creatorGrossCents - taxReserveCents;
    const platformCents = grossCents - creatorGrossCents;

    // 4. Execute transaction
    await prisma.$transaction([
      // Deduct sparks from viewer
      prisma.userCredits.update({
        where: { email: viewerEmail },
        data: { sparks: { decrement: sparkCost } },
      }),

      // Credit creator balance + tax reserve
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

      // Log to support ledger
      prisma.supportLedger.create({
        data: {
          creatorEmail,
          viewerEmail,
          kind: "GIFT",
          source: "LIVE",
          targetId: streamId,
          units: sparkCost,
          currency: "AUD",
          grossCents,
          creatorCents: creatorNetCents,
          platformCents,
        },
      }),

      // Inject voltage event
      prisma.creatorVoltageEvent.create({
        data: {
          creatorEmail,
          actorEmail: viewerEmail,
          eventType: "LIVE_GIFT_RECEIVED",
          points: Math.ceil(sparkCost / 10),
          targetType: "LIVE_SESSION",
          targetId: streamId,
          dedupeKey: `gift_${viewerEmail}_${streamId}_${giftId}_${Date.now()}`,
        },
      }),
    ]);

    // 5. Update creator voltage total
    await prisma.creatorProfile.update({
      where: { email: creatorEmail },
      data: { voltage: { increment: Math.ceil(sparkCost / 10) } },
    });

    return NextResponse.json({
      ok: true,
      sparkCost,
      grossCents,
      creatorNetCents,
      taxReserveCents,
      platformCents,
    });

  } catch (e: any) {
    console.error("[live/gift]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}