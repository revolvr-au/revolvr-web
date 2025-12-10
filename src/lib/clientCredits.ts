// src/lib/clientCredits.ts
export type CreditKind = "boost" | "tip" | "spin";

export async function spendCredit(
  email: string,
  kind: CreditKind
): Promise<{ ok: boolean; credits?: { boosts: number; tips: number; spins: number }; error?: string }> {
  try {
    const res = await fetch("/api/credits/spend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, kind }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data.error ?? "Failed to spend credit" };
    }

    return {
      ok: true,
      credits: data.credits ?? undefined,
    };
  } catch (err) {
    console.error("Error spending credit", err);
    return { ok: false, error: "Network or server error spending credit" };
  }
}
