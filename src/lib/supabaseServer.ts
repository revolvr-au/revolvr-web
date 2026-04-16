// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

type CookieStoreLike = {
  getAll?: () => Array<{ name: string; value: string }>;
  get?: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
};

export async function createSupabaseServerClient() {
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
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set?.(name, value, options);
          });
        } catch {
          // noop
        }
      },
    },
  });
}

export async function getAuthedEmailOrNull() {
  try {
    const cookieStore = await Promise.resolve(cookies());

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.email ?? null;
  } catch (e) {
    console.error("Auth fetch failed:", e);
    return null;
  }
}
