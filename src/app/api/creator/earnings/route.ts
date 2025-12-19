import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // adjust if using Supabase auth

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    /**
     * TEMP AUTH NOTE
     * Replace this with your real auth session lookup.
     * For now we accept creatorId via header for testing.
     */
    const creatorId = req.headers.get("x-creator-id");

    if (!creatorId) {
      return NextResponse.json(
        { error: "Missing creator identity" },
        { status: 401 }
      );
    }

    const balance = await prisma.creatorBalance.findUnique({
      where: { creatorId },
    });

    const payments = await prisma.payment.findMany({
      where: { creatorId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      balances: {
        lifetimeEarned: balance?.lifetimeEarned ?? 0,
        pendingBalance: balance?.pendingBalance ?? 0,
        availableBalance: balance?.availableBalance ?? 0,
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
    console.error("[creator/earnings]", err);
    return NextResponse.json(
      { error: "Failed to load earnings" },
      { status: 500 }
    );
  }
}
