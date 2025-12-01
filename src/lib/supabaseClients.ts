// src/lib/supabaseClients.ts

"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Simple env sanity check – shows up in browser console
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing env", {
    NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseAnonKey,
  });
} else {
  console.log("[Supabase] Env OK (URL + anon key present)");
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
