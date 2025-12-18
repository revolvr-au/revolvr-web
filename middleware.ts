// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const CANONICAL_HOST =
  process.env.NEXT_PUBLIC_CANONICAL_HOST || "revolvr-web.vercel.app";

function createMiddlewareSupabaseClient(req: NextRequest) {
  // Response that Supabase will attach refreshed auth cookies to
  const res = NextResponse.next({ request: req });

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

  return { supabase, res };
}

function isLocalhost(host: string) {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // ------------------------------------------------------------
  // 0) Canonical host enforcement (prevents preview-domain auth loops)
  // ------------------------------------------------------------
  const host = req.headers.get("host") || "";

  // Allow localhost/dev
  if (!isLocalhost(host)) {
    // Only enforce if we're on a Vercel host (or any host) that isn't canonical
    if (host !== CANONICAL_HOST) {
      const redirectUrl = url.clone();
      redirectUrl.host = CANONICAL_HOST;
      redirectUrl.protocol = "https:";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ------------------------------------------------------------
  // 1) Skip age-gate + auth checks on specific routes
  // ------------------------------------------------------------
  const isAgePage = pathname.startsWith("/age-verification");
  const isUnderagePage = pathname.startsWith("/underage");

  // Keep your existing auth pages, and also exclude callback/auth routes
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  if (isAgePage || isUnderagePage || isAuthPage) {
    return NextResponse.next();
  }

  // ------------------------------------------------------------
  // 2) Supabase cookie refresh + AU age-gate
  // ------------------------------------------------------------
  const { supabase, res } = createMiddlewareSupabaseClient(req);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → no age gate
  if (!user) return res;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("country, is_age_verified, underage_locked")
    .eq("id", user.id)
    .single();

  if (error || !profile) return res;

  // Only apply gate to Australian users
  if (profile.country !== "AU") return res;

  // Underage users always go to /underage
  if (profile.underage_locked) {
    if (!isUnderagePage) {
      const u = req.nextUrl.clone();
      u.pathname = "/underage";
      return NextResponse.redirect(u);
    }
    return res;
  }

  // AU + not verified → /age-verification
  if (!profile.is_age_verified) {
    const u = req.nextUrl.clone();
    u.pathname = "/age-verification";
    return NextResponse.redirect(u);
  }

  return res;
}

// Run middleware on all non-static, non-API routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
