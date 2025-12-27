import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

function safeRedirect(v: string | null) {
  if (!v) return "/public-feed";
  if (!v.startsWith("/")) return "/public-feed";
  if (v.startsWith("//")) return "/public-feed";
  if (v.includes("\\")) return "/public-feed";
  return v;
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

  // Response we can attach cookies to
  const res = NextResponse.redirect(new URL(redirectTo, url.origin));

  // IMPORTANT: in your build, cookies() is Promise-typed
  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  // If no code, just continue the redirect (already signed-in users may hit this route)
  if (!code) return res;

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // This commonly happens if the callback ran twice (code already consumed)
    const back = new URL("/login", url.origin);
    back.searchParams.set("redirectTo", redirectTo);
    back.searchParams.set("error", "otp_invalid_or_expired");
    return NextResponse.redirect(back);
  }

  return res;
}
