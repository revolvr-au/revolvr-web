// src/lib/creatorEarnings.ts
import { prisma } from "@/lib/prisma";

export async function getCreatorEarnings(creatorEmail: string) {
  const balance = await prisma.creatorBalance.findUnique({
    where: { creatorEmail },
  });

  const payments = await prisma.payment.findMany({
    where: { creatorId: creatorEmail },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
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
      createdAt: p.createdAt.toISOString(),
    })),
  };
}
