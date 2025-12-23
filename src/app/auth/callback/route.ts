// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function safeRedirect(path: string | null) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  // If supabase didn't give us a code, we can't exchange a session.
  if (!code) {
    return NextResponse.redirect(new URL("/login", url));
  }

  // IMPORTANT: create the response FIRST, then write cookies onto it.
  const res = NextResponse.redirect(new URL(redirectTo, url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
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
