import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { payoutRateFor } from "@/lib/ringPayout";

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

// AUD cents per spark (100 sparks = $2.99 AUD)
const CENTS_PER_SPARK = 2.99 / 100;

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

    const payoutRate = payoutRateFor(creator?.ringTier);

    // 3. Calculate split — the creator's full share is credited; Revolvr does
    // not withhold tax on their behalf.
    const grossCents = Math.round(sparkCost * CENTS_PER_SPARK * 100);
    const creatorCents = Math.round(grossCents * payoutRate);
    const platformCents = grossCents - creatorCents;

    // 4. Execute transaction
    await prisma.$transaction([
      // Deduct sparks from viewer
      prisma.userCredits.update({
        where: { email: viewerEmail },
        data: { sparks: { decrement: sparkCost } },
      }),

      // Credit creator balance
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
          creatorCents,
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
      creatorCents,
      platformCents,
    });

  } catch (e: any) {
    console.error("[live/gift]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}