import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/creator/dashboard";

  // Always redirect back to site origin
  const redirectTo = new URL(next, url.origin);

  if (!code) {
    // No code -> send them to login (or home)
    return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(next)}`, url.origin));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If exchange fails, go to login and let user retry
  if (error) {
    return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(next)}`, url.origin));
  }

  return NextResponse.redirect(redirectTo);
}
