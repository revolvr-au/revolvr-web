import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  // Helps in local dev; in prod these must exist.
  console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or ANON KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // keep this false because /auth/callback does the exchange
    flowType: "pkce",          // THIS is the key fix (stops #access_token redirects)
  },
});
