// src/lib/credits.ts
"use client";

import { supabase } from "./supabaseClients";

export type PurchaseMode = "tip" | "boost" | "spin";

export type CreditBalances = {
  tip: number;
  boost: number;
  spin: number;
};

/**
 * Load the current credit balances for a user from public."UserCredits".
 * This table has columns: email, tips, boosts, spins
 */
export async function loadCreditsForUser(
  email: string
): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from("UserCredits")
    .select("tips, boosts, spins")
    .eq("email", email)
    .maybeSingle();

  // If there's some unexpected error (not just "no rows"), surface it
  if (error && (error as any).code !== "PGRST116") {
    console.error("[credits] loadCreditsForUser error", error);
    throw error;
  }

  return {
    tip: data?.tips ?? 0,
    boost: data?.boosts ?? 0,
    spin: data?.spins ?? 0,
  };
}

/**
 * Spend a single credit of the given mode, and return the updated balances.
 */
export async function spendOneCredit(
  email: string,
  mode: PurchaseMode
): Promise<CreditBalances> {
  // First, fetch current balance
  const { data, error } = await supabase
    .from("UserCredits")
    .select("tips, boosts, spins")
    .eq("email", email)
    .single();

  if (error) {
    console.error("[credits] spendOneCredit fetch error", error);
    throw error;
  }

  const current: CreditBalances = {
    tip: data?.tips ?? 0,
    boost: data?.boosts ?? 0,
    spin: data?.spins ?? 0,
  };

  // Decide which bucket to decrement
  if (mode === "tip" && current.tip <= 0) {
    throw new Error("No tip credits available");
  }
  if (mode === "boost" && current.boost <= 0) {
    throw new Error("No boost credits available");
  }
  if (mode === "spin" && current.spin <= 0) {
    throw new Error("No spin credits available");
  }

  const updatedRow = {
    tips: mode === "tip" ? current.tip - 1 : current.tip,
    boosts: mode === "boost" ? current.boost - 1 : current.boost,
    spins: mode === "spin" ? current.spin - 1 : current.spin,
  };

  const { error: updateError } = await supabase
    .from("UserCredits")
    .update(updatedRow)
    .eq("email", email);

  if (updateError) {
    console.error("[credits] spendOneCredit update error", updateError);
    throw updateError;
  }

  return {
    tip: updatedRow.tips,
    boost: updatedRow.boosts,
    spin: updatedRow.spins,
  };
}
