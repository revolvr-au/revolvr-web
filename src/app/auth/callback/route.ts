import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const safeRedirect = (v: string | null) => {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const back = new URL("/login?error=missing_env", url.origin);
    return NextResponse.redirect(back);
  }

  // response we can attach cookies to
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));

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

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const back = new URL("/login", url.origin);
        back.searchParams.set("redirectTo", redirectTo);
        back.searchParams.set("error", "otp_invalid_or_expired");
        return NextResponse.redirect(back);
      }
    }
  } catch {
    const back = new URL("/login", url.origin);
    back.searchParams.set("redirectTo", redirectTo);
    back.searchParams.set("error", "otp_exchange_failed");
    return NextResponse.redirect(back);
  }

  return res;
}
