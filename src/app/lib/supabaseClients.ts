"use client";

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 🔊 DEBUG LOGS – these will show up in the browser console
console.log("[Revolvr] SUPABASE URL:", supabaseUrl);
console.log(
  "[Revolvr] HAS ANON KEY?",
  typeof supabaseAnonKey === "string",
  supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + "..." : "(missing)"
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Revolvr] Missing Supabase env vars. Check Vercel env for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
