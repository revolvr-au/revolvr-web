import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createSupabaseServerClient() {
  // Note: Next cookies() can be sync in some Next versions; this handles both.
  const cookieStore: any = await Promise.resolve(cookies() as any);

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof cookieStore.getAll === "function") return cookieStore.getAll();
          return [];
        },
        setAll(cookiesToSet) {
          if (typeof cookieStore.set !== "function") return;
          cookiesToSet.forEach(({ name, value, options }: any) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function getAuthedEmailOrNull() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data?.user?.email;

  if (error || !email) return null;
  return String(email).trim().toLowerCase();
}
