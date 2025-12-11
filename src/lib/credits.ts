// src/lib/credits.ts
import { supabase } from "@/lib/supabaseClients";

export type PurchaseMode = "tip" | "boost" | "spin";

export type CreditBalances = {
  tip: number;
  boost: number;
  spin: number;
};

export type PackMode = "tip-pack" | "boost-pack" | "spin-pack";

const EMPTY_BALANCES: CreditBalances = {
  tip: 0,
  boost: 0,
  spin: 0,
};

function normalizeRow(row: any | null): CreditBalances {
  if (!row) return { ...EMPTY_BALANCES };
  return {
    tip: row.tip_credits ?? 0,
    boost: row.boost_credits ?? 0,
    spin: row.spin_credits ?? 0,
  };
}

/**
 * Load current balances for a user. Returns zeros if no row exists yet.
 */
export async function loadCreditsForUser(
  userEmail: string
): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("tip_credits, boost_credits, spin_credits")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error) {
    console.error("[credits] loadCreditsForUser error", error);
    throw error;
  }

  return normalizeRow(data);
}

/**
 * Persist balances for a user, creating/updating the row.
 */
async function saveCreditsForUser(
  userEmail: string,
  balances: CreditBalances
): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from("user_credits")
    .upsert(
      {
        user_email: userEmail,
        tip_credits: balances.tip,
        boost_credits: balances.boost,
        spin_credits: balances.spin,
      },
      { onConflict: "user_email" }
    )
    .select("tip_credits, boost_credits, spin_credits")
    .single();

  if (error) {
    console.error("[credits] saveCreditsForUser error", error);
    throw error;
  }

  return normalizeRow(data);
}

/**
 * Spend a single credit of the given type. Throws if none available.
 * Returns updated balances.
 */
export async function spendOneCredit(
  userEmail: string,
  mode: PurchaseMode
): Promise<CreditBalances> {
  const current = await loadCreditsForUser(userEmail);
  const updated: CreditBalances = { ...current };

  switch (mode) {
    case "tip":
      if (updated.tip <= 0) {
        throw new Error("No tip credits left");
      }
      updated.tip -= 1;
      break;
    case "boost":
      if (updated.boost <= 0) {
        throw new Error("No boost credits left");
      }
      updated.boost -= 1;
      break;
    case "spin":
      if (updated.spin <= 0) {
        throw new Error("No spin credits left");
      }
      updated.spin -= 1;
      break;
  }

  return saveCreditsForUser(userEmail, updated);
}

/**
 * Apply a completed pack purchase to the user's balances.
 * Returns updated balances.
 *
 * IMPORTANT: this assumes each pack is:
 * - tip-pack   -> 10 × tips
 * - boost-pack -> 10 × boosts
 * - spin-pack  -> 20 × spins
 */
export async function applyPackPurchase(
  userEmail: string,
  mode: PackMode
): Promise<CreditBalances> {
  const current = await loadCreditsForUser(userEmail);
  const updated: CreditBalances = { ...current };

  switch (mode) {
    case "tip-pack":
      updated.tip += 10;
      break;
    case "boost-pack":
      updated.boost += 10;
      break;
    case "spin-pack":
      updated.spin += 20;
      break;
  }

  return saveCreditsForUser(userEmail, updated);
}
