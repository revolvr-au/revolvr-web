import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);

  console.log("[auth/callback] url", url.toString());
  console.log("[auth/callback] redirectTo param", url.searchParams.get("redirectTo"));

  const redirectTo = url.searchParams.get("redirectTo") || "/";

  // Supabase can return either:
  // - PKCE:   ?code=...
  // - Magic:  ?token_hash=...&type=magiclink (or recovery/invite/etc)
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

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

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) console.error("[auth/callback] exchangeCodeForSession", error);
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: type as any,
      });
      if (error) console.error("[auth/callback] verifyOtp", error);
    } else {
      return NextResponse.redirect(
        new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
      );
    }
  } catch (e) {
    console.error("[auth/callback] unexpected", e);
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  // internal-only redirect guard
  const safe =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.includes("\\")
      ? redirectTo
      : "/public-feed";

  return NextResponse.redirect(new URL(safe, url.origin));
}
