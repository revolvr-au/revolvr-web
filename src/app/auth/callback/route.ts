import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const safeRedirect = (v: string | null) => {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
};

function parseCookieHeader(header: string | null) {
  if (!header) return [];
  return header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((kv) => {
      const idx = kv.indexOf("=");
      if (idx === -1) return { name: kv, value: "" };
      return { name: kv.slice(0, idx), value: kv.slice(idx + 1) };
    });
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    const back = new URL("/login", url.origin);
    back.searchParams.set("error", "missing_env");
    back.searchParams.set("redirectTo", redirectTo);
    return NextResponse.redirect(back);
  }

  // Response we can attach cookies to (Supabase will set pkce/session cookies here)
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));

  // Read incoming cookies from the request header (avoids cookies() Promise typing issues)
  const reqCookies = parseCookieHeader(req.headers.get("cookie"));

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return reqCookies;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    if (!code) {
      // No code means user hit /auth/callback directly — send them back to login cleanly
      const back = new URL("/login", url.origin);
      back.searchParams.set("redirectTo", redirectTo);
      back.searchParams.set("error", "missing_code");
      return NextResponse.redirect(back);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const back = new URL("/login", url.origin);
      back.searchParams.set("redirectTo", redirectTo);
      back.searchParams.set("error", "otp_invalid_or_expired");
      return NextResponse.redirect(back);
    }
  } catch {
    const back = new URL("/login", url.origin);
    back.searchParams.set("redirectTo", redirectTo);
    back.searchParams.set("error", "otp_exchange_failed");
    return NextResponse.redirect(back);
  }

  return res;
}
