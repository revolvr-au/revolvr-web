import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const safeRedirect = (v: string | null) => {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(new URL("/login?error=missing_env", url.origin));
  }

  // Create a response we can attach cookies to
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));

  // IMPORTANT: cookies() is Promise-typed in your Next build, so await it.
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
  });

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        // If the code is already used/expired, send them back to login cleanly.
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
