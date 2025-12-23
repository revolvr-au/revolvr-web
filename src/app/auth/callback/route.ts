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

  const cookieStore = await cookies();

  // Highest priority: explicit redirectTo query param
  const qpRedirect = url.searchParams.get("redirectTo");

  // Fallback: cookie set by /login before sending the magic link
  const cookieRedirectRaw = cookieStore.get("rv_redirect")?.value ?? null;
  const cookieRedirect = cookieRedirectRaw
    ? decodeURIComponent(cookieRedirectRaw)
    : null;

  const redirectTo = safeRedirect(qpRedirect ?? cookieRedirect);

  if (!code) {
    return NextResponse.redirect(new URL("/login", url));
  }

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

  // Always clear the one-time redirect cookie (prevents stale redirects)
  cookieStore.set("rv_redirect", "", { path: "/", maxAge: 0 });

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(new URL("/login", url));
  }

  return NextResponse.redirect(new URL(redirectTo, url));
}
