import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function safeRedirect(path: string | null | undefined) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();

  // Prefer cookie-set destination (from login button),
  // fall back to query param, then to default.
  const cookieRedirect = cookieStore.get("rv_redirect")?.value;
  const queryRedirect = url.searchParams.get("redirectTo");
  const redirectTo = safeRedirect(
    cookieRedirect ? decodeURIComponent(cookieRedirect) : queryRedirect
  );

  // Always clear the redirect cookie so it doesn't "stick"
  cookieStore.set("rv_redirect", "", { path: "/", maxAge: 0 });

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

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(new URL("/login", url));
  }

  return NextResponse.redirect(new URL(redirectTo, url));
}
