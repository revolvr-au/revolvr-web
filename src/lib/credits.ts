// src/lib/credits.ts
import { supabase } from "@/lib/supabaseClients";

export type PurchaseMode = "tip" | "boost" | "spin";

export type CreditBalances = {
  tip: number;
  boost: number;
  spin: number;
};

const TABLE = "UserCredits"; // Prisma table

type UserCreditsRow = {
  tips: number | null;
  boosts: number | null;
  spins: number | null;
};

function normalizeRow(row: UserCreditsRow | null): CreditBalances {
  return {
    tip: row?.tips ?? 0,
    boost: row?.boosts ?? 0,
    spin: row?.spins ?? 0,
  };
}

/**
 * Load the current credit balances for a user.
 * Reads from public."UserCredits" (Prisma table).
 */
export async function loadCreditsForUser(email: string): Promise<CreditBalances> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("tips, boosts, spins")
    .eq("email", email)
    .maybeSingle<UserCreditsRow>();

  if (error) {
    console.error("[credits] loadCreditsForUser error", error);
    throw error;
  }

  return normalizeRow(data ?? null);
}

/**
 * Spend exactly one credit of the given mode for this user.
 * Returns the UPDATED balances.
 */
export async function spendOneCredit(
  email: string,
  mode: PurchaseMode
): Promise<CreditBalances> {
  const current = await loadCreditsForUser(email);

  const canSpend =
    mode === "tip"
      ? current.tip > 0
      : mode === "boost"
      ? current.boost > 0
      : current.spin > 0;

  if (!canSpend) {
    throw new Error("[credits] No credits available to spend");
  }

  const updates: Partial<UserCreditsRow> = {};

  if (mode === "tip") updates.tips = current.tip - 1;
  else if (mode === "boost") updates.boosts = current.boost - 1;
  else updates.spins = current.spin - 1;

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq("email", email)
    .select("tips, boosts, spins")
    .maybeSingle<UserCreditsRow>();

  if (error) {
    console.error("[credits] spendOneCredit error", error);
    throw error;
  }

  const normalized = normalizeRow(data ?? null);
  console.log("[credits] after spendOneCredit", mode, normalized);
  return normalized;
}
