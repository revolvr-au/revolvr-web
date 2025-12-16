import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const INTENT_COOKIE = "revolvr_intent";
const REDIRECT_COOKIE = "revolvr_redirectTo";

function safeRedirect(path: string | null | undefined) {
  if (!path) return "/public-feed";
  return path.startsWith("/") ? path : "/public-feed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();

  const intent = cookieStore.get(INTENT_COOKIE)?.value || null;
  const cookieRedirect = cookieStore.get(REDIRECT_COOKIE)?.value || null;
  const queryRedirect = url.searchParams.get("redirectTo");

  const redirectTo = safeRedirect(
    queryRedirect || (cookieRedirect ? decodeURIComponent(cookieRedirect) : null)
  );

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

  // Fetch user to decide where to land
  const { data } = await supabase.auth.getUser();
  const isCreator = Boolean(data.user?.user_metadata?.is_creator);

  // Clear cookies used for hopping
  cookieStore.set(REDIRECT_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(INTENT_COOKIE, "", { path: "/", maxAge: 0 });

  // If they clicked "Go Live as Creator", force onboarding unless already creator
  if (intent === "creator" && !isCreator) {
    return NextResponse.redirect(new URL("/creator/onboard", url.origin));
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
