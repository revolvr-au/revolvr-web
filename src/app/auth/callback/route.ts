import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function safeRedirect(path: string | null | undefined) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();
  const cookieRedirect = cookieStore.get("revolvr_redirectTo")?.value;
  const queryRedirect = url.searchParams.get("redirectTo");

  const redirectTo = safeRedirect(queryRedirect || (cookieRedirect ? decodeURIComponent(cookieRedirect) : null));

  // If no code, bounce to login (keep redirectTo)
  if (!code) {
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
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
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, url.origin)
    );
  }

  // clear the redirect cookie once used
  cookieStore.set("revolvr_redirectTo", "", { path: "/", maxAge: 0 });

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
