import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAgeRouting } from "@/lib/ageGate";
import { normalizeEmail } from "@/lib/dm";

export async function proxy(request: NextRequest) {
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

    // Jurisdiction scope: the gate is AU-only. Country is derived from the Vercel
    // edge header (set upstream of app code, unspoofable by the browser) — never
    // from client input. Non-AU authed users pass through untouched: no age_status
    // read, no DOB wall, no redirect.
    //
    // Missing/empty header -> fail-closed to AU (gate it), consistent with
    // resolveJurisdiction's existing strict default. In Vercel production this
    // header is reliably present, so this only bites genuinely header-absent
    // requests, never normal non-AU traffic (US/GB/... carry a country and fall
    // through). The trade: a rare one-time DOB wall vs. an AU user bypassing on a
    // header glitch.
    const country = (request.headers.get("x-vercel-ip-country") ?? "").trim().toUpperCase();
    const inGatedJurisdiction = country === "AU" || country === "";

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
    // Segment-boundary match: a prefix excludes only its exact path or a
    // descendant (prefix + "/..."), so "/onboard" never accidentally excludes
    // a future "/onboarding".
    const isExcluded = EXCLUDED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

    if (inGatedJurisdiction && !isExcluded) {
      // Fail-closed on every failure mode. A returned null row / null status
      // funnels through resolveAgeRouting; a THROWN read (DB unreachable / pool
      // timeout) is caught and converted to the same undefined -> verify path,
      // so a DB hiccup degrades to a clean /age-verification redirect instead of
      // a site-wide 500 across every gated route.
      let ageStatus: string | null | undefined;
      try {
        // Normalize the read key to match the write path (profiles.age_status
        // is written under normalizeEmail(...)), so read-key == write-key.
        const profile = await prisma.profiles.findUnique({
          where: { email: normalizeEmail(user.email!) },
          select: { age_status: true },
        });
        ageStatus = profile?.age_status;
      } catch (e) {
        console.error("[proxy] age_status read failed, failing closed", e);
        ageStatus = undefined; // -> resolveAgeRouting -> NEEDS_VERIFICATION
      }

      const routing = resolveAgeRouting(ageStatus);

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
