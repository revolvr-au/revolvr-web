import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const creatorEmail = req.headers.get("x-creator-email");
  if (!creatorEmail) {
    return NextResponse.json(
      { error: "Missing x-creator-email" },
      { status: 400 }
    );
  }

  try {
    const balance = await prisma.creatorBalance.findUnique({
      where: { creatorEmail },
    });

    const payments = await prisma.payment.findMany({
      // In your current setup, you’ve been storing email into Payment.creatorId
      where: { creatorId: creatorEmail },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      balances: {
        lifetimeEarned: balance?.totalEarnedCents ?? 0,
        availableBalance: balance?.availableCents ?? 0,
      },
      recentPayments: payments.map((p) => ({
        id: p.id,
        amountGross: p.amountGross,
        amountCreator: p.amountCreator,
        currency: p.currency,
        type: p.type,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("[creator/earnings] error", err);
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 }
    );
  }
}
