// src/lib/credits.ts
"use client";

import { supabase } from "@/lib/supabaseClients";

export type PurchaseMode = "tip" | "boost" | "spin";

export type CreditBalances = {
  tip: number;
  boost: number;
  spin: number;
};

/**
 * Load the current credit balance for a user.
 */
export async function loadCreditsForUser(
  userEmail: string
): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("tip_credits, boost_credits, spin_credits")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    console.error("[credits] loadCreditsForUser error", error);
    throw error;
  }

  return {
    tip: data?.tip_credits ?? 0,
    boost: data?.boost_credits ?? 0,
    spin: data?.spin_credits ?? 0,
  };
}

/**
 * Decrement 1 credit of the given type for this user.
 * Returns the new balances.
 */
export async function spendOneCredit(
  userEmail: string,
  mode: PurchaseMode
): Promise<CreditBalances> {
  const current = await loadCreditsForUser(userEmail);

  const has =
    mode === "tip"
      ? current.tip
      : mode === "boost"
      ? current.boost
      : current.spin;

  if (has <= 0) {
    throw new Error("No credits available to spend for " + mode);
  }

  const creditColumn =
    mode === "tip"
      ? "tip_credits"
      : mode === "boost"
      ? "boost_credits"
      : "spin_credits";

  const newValue = has - 1;

  const { error } = await supabase
    .from("user_credits")
    .update({ [creditColumn]: newValue })
    .eq("user_email", userEmail);

  if (error) {
    console.error("[credits] spendOneCredit update error", error);
    throw error;
  }

  const updated: CreditBalances =
    mode === "tip"
      ? { ...current, tip: newValue }
      : mode === "boost"
      ? { ...current, boost: newValue }
      : { ...current, spin: newValue };

  return updated;
}
