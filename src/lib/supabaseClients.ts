import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
console.log("[supabase] url:", supabaseUrl);
console.log("[supabase] anon key present:", Boolean(supabaseAnonKey));
console.log("[supabase] anon key length:", supabaseAnonKey?.length ?? 0);

console.log("[supabase] url:", process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // we handle it manually in /auth/callback
    storageKey: "revolvr-auth",
  },
});
