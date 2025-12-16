import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,

    // Use PKCE explicitly (you are using code exchange)
    flowType: "pkce",

    // Keep your manual callback flow
    detectSessionInUrl: false,

    // Optional but recommended to avoid collisions across preview/prod
    storageKey: "revolvr-auth",
  },
});
