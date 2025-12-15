import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const REDIRECT_COOKIE = "revolvr_redirectTo";

function safeRedirect(path: string | null | undefined) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();

  const queryRedirect = url.searchParams.get("redirectTo");
  const cookieRedirectRaw = cookieStore.get(REDIRECT_COOKIE)?.value;

  // cookie value may be URI-encoded; decode safely
  let cookieRedirect: string | null = null;
  if (cookieRedirectRaw) {
    try {
      cookieRedirect = decodeURIComponent(cookieRedirectRaw);
    } catch {
      cookieRedirect = cookieRedirectRaw;
    }
  }

  const redirectTo = safeRedirect(queryRedirect || cookieRedirect);

  // If no code, bounce to login (keep redirectTo)
  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  // Must have env vars at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnon) {
    // fail safe: send back to login rather than white page
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
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
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  // Clear redirect cookie once used (prevent future “sticky” misroutes)
  cookieStore.set(REDIRECT_COOKIE, "", { path: "/", maxAge: 0 });

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
