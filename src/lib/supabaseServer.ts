// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

type CookieStoreLike = {
  getAll?: () => Array<{ name: string; value: string }>;
  set?: (name: string, value: string, options?: CookieOptions) => void;
};

export async function createSupabaseServerClient() {
  // Next cookies() can be sync in some Next versions; this handles both.
  const cookieStore = (await Promise.resolve(cookies())) as unknown as CookieStoreLike;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return typeof cookieStore.getAll === "function" ? cookieStore.getAll() : [];
      },
      setAll(cookiesToSet: CookieToSet[]) {
        if (typeof cookieStore.set !== "function") return;

        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set?.(name, value, options);
        });
      },
    },
  });
}

export async function getAuthedEmailOrNull() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data?.user?.email;

  if (error || !email) return null;
  return String(email).trim().toLowerCase();
}
