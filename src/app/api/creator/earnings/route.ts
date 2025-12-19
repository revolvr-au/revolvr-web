import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const creatorEmail = req.headers.get("x-creator-email");
    if (!creatorEmail) {
      return NextResponse.json(
        { error: "Missing creator email" },
        { status: 401 }
      );
    }

    const balance = await prisma.creatorBalance.findUnique({
      where: { creatorEmail },
    });

    const payments = await prisma.payment.findMany({
      where: { creatorId: creatorEmail }, // your Payment model uses creatorId string; you’ve been storing email here
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      balances: {
        lifetimeEarned: balance?.totalEarnedCents ?? 0,
        pendingBalance: 0, // not in your current schema
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
    console.error("[api/creator/earnings]", err);
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 }
    );
  }
}
