// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function safeRedirect(path: string | null) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Determine where to go after login
  const qpRedirect = url.searchParams.get("redirectTo");
  const redirectTo = safeRedirect(qpRedirect);

  // If no code, bounce to login
  if (!code) {
    return NextResponse.redirect(new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url));
  }

  // Create the redirect response up-front so we can attach cookies to it
  const res = NextResponse.redirect(new URL(redirectTo, url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Read from the incoming request
          return (req as any).cookies?.getAll?.() ?? [];
        },
        setAll(cookiesToSet) {
          // Write to the outgoing response (this is the critical bit)
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
