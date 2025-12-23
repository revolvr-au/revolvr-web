// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function safeRedirect(path: string | null) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  // If we don't have a code, we cannot complete PKCE on the server.
  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url)
    );
  }

  const cookieStore = await cookies();

  // Create response first so Supabase can attach cookies to it
  const res = NextResponse.redirect(new URL(redirectTo, url));

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
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(new URL("/login", url));
  }

  return res;
}
