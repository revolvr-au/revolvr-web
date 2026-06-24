import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAgeRouting } from "@/lib/ageGate";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const url = request.nextUrl.clone();
  const isLiveRoute = url.pathname.startsWith("/live");

  // Canonical-domain enforcement, production only. Any non-canonical host in
  // production (apex revolvr.net, the *.vercel.app alias, etc.) is redirected to
  // www.revolvr.net. Preview/dev deploys (VERCEL_ENV !== "production") skip this
  // entirely so their *.vercel.app URLs stay viewable.
  if (
    process.env.VERCEL_ENV === "production" &&
    !isLiveRoute &&
    host !== "www.revolvr.net"
  ) {
    url.protocol = "https:";
    url.host = "www.revolvr.net";
    return NextResponse.redirect(url, 307);
  }

  // Supabase session refresh
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Age-gate enforcement. Inert by default — only runs when AGE_GATE_ENABLED is
  // explicitly "true". Applies ONLY to authenticated users; unauthenticated
  // requests fall through (auth is enforced elsewhere). Reuses the supabase
  // client + getUser() result above; reads age_status via Prisma (Next 16
  // middleware runs on Node, so Prisma works here). Fail-closed: a missing row
  // or absent age_status routes to verification, never PROCEED.
  if (process.env.AGE_GATE_ENABLED === "true" && user) {
    const pathname = url.pathname;

    // Skip the gate for surfaces that must stay reachable: studio, the
    // self-gating API, auth/onboarding/login surfaces, the gate pages
    // themselves (to avoid redirect loops), Next internals, and legal copy.
    const EXCLUDED_PREFIXES = [
      "/studio",
      "/api",
      "/auth",
      "/age-verification",
      "/underage",
      "/welcome",
      "/onboard",
      "/_next",
      "/legal",
    ];
    const isExcluded = EXCLUDED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );

    if (!isExcluded) {
      const profile = await prisma.profiles.findUnique({
        where: { email: user.email! },
        select: { age_status: true },
      });

      // Fail-closed: null profile / null age_status -> NEEDS_VERIFICATION.
      const routing = resolveAgeRouting(profile?.age_status);

      if (routing === "NEEDS_VERIFICATION") {
        const target = url.clone();
        target.pathname = "/age-verification";
        return NextResponse.redirect(target, 307);
      }
      if (routing === "EXCLUDED") {
        const target = url.clone();
        target.pathname = "/underage";
        return NextResponse.redirect(target, 307);
      }
      // "PROCEED" -> fall through, return the existing response unchanged.
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
