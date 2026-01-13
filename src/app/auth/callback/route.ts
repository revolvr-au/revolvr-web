// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const safeRedirect = (v: string | null) => {
  // Pick the *one* page you actually want after login:
  // If the “right creator profile” is /creator, set it here.
  const FALLBACK = "/creator";

  if (!v) return FALLBACK;
  if (!v.startsWith("/")) return FALLBACK;
  if (v.startsWith("//")) return FALLBACK;
  if (v.includes("\\")) return FALLBACK;
  return v;
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(new URL("/login?error=missing_env", url.origin));
  }

  // Prepare the final redirect response (cookies attached to this response)
  const res = NextResponse.redirect(new URL(redirectTo, url.origin), { status: 302 });
  res.headers.set("Cache-Control", "no-store");

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
  });

  if (!code) {
    // No code -> just go where we were headed
    return res;
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("redirectTo", redirectTo);
    back.searchParams.set("error", "otp_invalid_or_expired");
    return NextResponse.redirect(back, { status: 302 });
  }

  return res;
}
