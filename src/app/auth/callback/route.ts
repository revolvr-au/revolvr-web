// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const redirectToRaw = searchParams.get("redirectTo") ?? "/public-feed";

  // Prevent open-redirects
  const redirectTo = redirectToRaw.startsWith("/") ? redirectToRaw : "/public-feed";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // IMPORTANT: create the response FIRST so we can attach Set-Cookie to it
  const res = NextResponse.redirect(new URL(redirectTo, origin));

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Attach cookies to the redirect response (this is what the browser receives)
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  return res;
}
