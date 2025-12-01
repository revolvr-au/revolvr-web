"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug without leaking secrets
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing env vars", {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
  });
} else {
  console.log("[Supabase] Env OK (URL + anon key present)");
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
