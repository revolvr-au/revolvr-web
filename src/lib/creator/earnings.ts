// src/lib/creator/earnings.ts
export type CreatorEarningsResponse = {
  balances: {
    lifetimeEarned: number;
    availableBalance: number;
  };
  recentPayments: Array<{
    id: string;
    amountGross: number;
    amountCreator: number;
    currency: string;
    type: string;
    createdAt: string;
  }>;
};

export async function fetchCreatorEarnings(opts: {
  baseUrl: string;
  creatorEmail: string;
}): Promise<CreatorEarningsResponse> {
  const res = await fetch(`${opts.baseUrl}/api/creator/earnings`, {
    method: "GET",
    headers: {
      "x-creator-email": opts.creatorEmail,
    },
    // Avoid caching so the creator sees latest balance
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Earnings API failed: ${res.status} ${text}`);
  }

  return (await res.json()) as CreatorEarningsResponse;
}
