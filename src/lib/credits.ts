// src/lib/credits.ts
import { supabase } from "@/lib/supabaseClients";

export type PurchaseMode = "tip" | "boost" | "spin";

export type CreditBalances = {
  tip: number;
  boost: number;
  spin: number;
};

/**
 * Load the current credit balances for a user from user_credits.
 * If the user has no row yet, returns 0s.
 */
export async function loadCreditsForUser(
  email: string
): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("tip_credits, boost_credits, spin_credits")
    .eq("user_email", email)
    .maybeSingle();

  if (error) {
    console.error("[credits] loadCreditsForUser error", error);
    throw error;
  }

  if (!data) {
    // No row yet – treat as zero credits
    return { tip: 0, boost: 0, spin: 0 };
  }

  const balances: CreditBalances = {
    tip: data.tip_credits ?? 0,
    boost: data.boost_credits ?? 0,
    spin: data.spin_credits ?? 0,
  };

  console.log("[credits] loaded balances for", email, balances);
  return balances;
}

/**
 * Spend a single credit of the given mode and return the updated balances.
 * For now this is a simple read-then-write (good enough for v0.1).
 */
export async function spendOneCredit(
  email: string,
  mode: PurchaseMode
): Promise<CreditBalances> {
  // 1) Load current balances
  const current = await loadCreditsForUser(email);

  const next: CreditBalances = { ...current };
  if (mode === "tip") {
    if (next.tip <= 0) throw new Error("No tip credits left");
    next.tip -= 1;
  } else if (mode === "boost") {
    if (next.boost <= 0) throw new Error("No boost credits left");
    next.boost -= 1;
  } else {
    if (next.spin <= 0) throw new Error("No spin credits left");
    next.spin -= 1;
  }

  // 2) Persist back to user_credits
  const { error } = await supabase.from("user_credits").upsert({
    user_email: email,
    tip_credits: next.tip,
    boost_credits: next.boost,
    spin_credits: next.spin,
  });

  if (error) {
    console.error("[credits] spendOneCredit error", error);
    throw error;
  }

  console.log("[credits] spent 1", mode, "credit for", email, "=>", next);
  return next;
}
