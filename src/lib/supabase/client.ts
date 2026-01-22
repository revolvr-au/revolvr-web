import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Do not throw at import-time in production builds, but make the issue obvious in dev.
  // The overlay will simply not subscribe if env vars are missing.
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url || "", anon || "");
