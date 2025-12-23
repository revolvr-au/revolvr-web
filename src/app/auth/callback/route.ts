import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function safeRedirect(path: string | null) {
  if (!path) return "/creator"; // default to creator, not public-feed
  return path.startsWith("/") ? path : "/creator";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectTo = safeRedirect(url.searchParams.get("redirectTo"));

  // Always construct login URL WITH redirectTo so we never fall back to /public-feed
  const loginUrl = new URL("/login", url);
  loginUrl.searchParams.set("redirectTo", redirectTo);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();

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
  const raw = cookieStore.get("rv_redirect")?.value ?? "";
cookieStore.set("rv_redirect", "", { path: "/", maxAge: 0 });

let dest = "/public-feed";
try {
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith("/")) dest = decoded;
} catch {}

return NextResponse.redirect(new URL(dest, url));

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", error);
    return NextResponse.redirect(loginUrl);
  }

  // Success: land where you intended
  return NextResponse.redirect(new URL(redirectTo, url));
}
