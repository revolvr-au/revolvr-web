import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type SpendKind = "boost" | "tip" | "spin" | "reaction";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Not enough credits");
    this.name = "InsufficientCreditsError";
  }
}

export async function spendCredits(email: string, kind: SpendKind) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("spend_credits", {
    _email: email,
    _amount: 1,
    _kind: kind,
  });

  if (error) {
    if (error.message?.includes("Insufficient")) {
      throw new InsufficientCreditsError();
    }
    throw error;
  }

  const { data, error: fetchError } = await supabase
    .from("credits")
    .select("*")
    .eq("email", email)
    .single();

  if (fetchError) throw fetchError;

  return data;
}