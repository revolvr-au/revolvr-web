import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAgeRouting } from "@/lib/ageGate";
import { normalizeEmail } from "@/lib/dm";

// Surfaces that must stay reachable for a user who has cleared NEITHER gate: studio,
// the self-gating APIs, auth/login, the gate pages themselves, /onboard (excluded from
// its OWN guard below, or it would redirect to itself), Next internals, and legal copy.
//
// Shared by BOTH the age gate and the onboarding guard on purpose. These were one list
// duplicated the moment a second guard appeared, and a prefix present in one but not the
// other is a redirect loop — so there is only ever one list.
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

// Segment-boundary match: a prefix excludes only its exact path or a descendant
// (prefix + "/..."), so "/onboard" never accidentally excludes a future "/onboarding".
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

type ProfileGateRow = {
  age_status: string | null;
  display_name: string | null;
  handle: string | null;
};

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

  const pathname = url.pathname;
  const isExcluded = isExcludedPath(pathname);

  // ── ONE profile read, shared by both guards below ──────────────────────────────
  // The age gate needs age_status and the onboarding guard needs display_name +
  // handle. Both are per-request, and the connection pool has NO headroom
  // (connection_limit=5), so this is a single round-trip rather than two reads.
  //
  // Why raw SQL: `handle` lives on CreatorProfile, a different table with no Prisma
  // relation to `profiles` (they are joined only by email), so no findUnique/include
  // can fetch both. A LEFT JOIN is the only single-round-trip option.
  //
  // Why the join is driven off a subquery instead of `FROM profiles`: a row can exist
  // in EITHER table alone. wesbuhagiar@gmail.com has a CreatorProfile and no profiles
  // row — `FROM profiles` would return zero rows there and silently lose the handle.
  // Selecting the email first guarantees exactly one row back in every case, with
  // NULLs for whichever side is missing.
  //
  // Email keys match the hub's reads exactly (src/app/page.tsx findUnique on the
  // normalized email, equality on both tables) so the proxy and the hub can never
  // disagree about who is onboarded.
  let profileRow: ProfileGateRow | undefined;
  let readFailed = false;

  if (user && !isExcluded) {
    try {
      const email = normalizeEmail(user.email!);
      const rows = await prisma.$queryRaw<ProfileGateRow[]>`
        SELECT p."age_status", p."display_name", c."handle"
        FROM (SELECT ${email}::text AS email) k
        LEFT JOIN public."profiles" p ON p."email" = k.email
        LEFT JOIN public."CreatorProfile" c ON c."email" = k.email
      `;
      profileRow = rows[0];
    } catch (e) {
      console.error("[proxy] profile gate read failed", e);
      readFailed = true;
    }
  }

  // ── 1. Age gate ───────────────────────────────────────────────────────────────
  // Runs FIRST so an AU user gets age -> onboard -> feed, never onboard -> age.
  // Inert by default — only when AGE_GATE_ENABLED is explicitly "true". Applies ONLY
  // to authenticated users; unauthenticated requests fall through (auth is enforced
  // elsewhere).
  if (process.env.AGE_GATE_ENABLED === "true" && user && !isExcluded) {
    // Jurisdiction scope: the gate is AU-only. Country is derived from the Vercel
    // edge header (set upstream of app code, unspoofable by the browser) — never
    // from client input. Non-AU authed users pass through untouched: no DOB wall,
    // no redirect.
    //
    // Missing/empty header -> fail-closed to AU (gate it), consistent with
    // resolveJurisdiction's existing strict default. In Vercel production this
    // header is reliably present, so this only bites genuinely header-absent
    // requests, never normal non-AU traffic (US/GB/... carry a country and fall
    // through). The trade: a rare one-time DOB wall vs. an AU user bypassing on a
    // header glitch.
    const country = (request.headers.get("x-vercel-ip-country") ?? "").trim().toUpperCase();
    const inGatedJurisdiction = country === "AU" || country === "";

    if (inGatedJurisdiction) {
      // Fail-CLOSED on every failure mode. A missing row / null status funnels
      // through resolveAgeRouting; a THROWN read (DB unreachable / pool timeout)
      // becomes the same undefined -> verify path, so a DB hiccup degrades to a
      // clean /age-verification redirect instead of a site-wide 500.
      const routing = resolveAgeRouting(
        readFailed ? undefined : profileRow?.age_status
      );

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
      // "PROCEED" -> fall through to the onboarding guard.
    }
  }

  // ── 2. Onboarding guard ───────────────────────────────────────────────────────
  // Runs AFTER the age gate, and deliberately NOT behind AGE_GATE_ENABLED and NOT
  // jurisdiction-scoped: onboarding applies to every authenticated user everywhere.
  //
  // This exists because src/app/page.tsx was the ONLY redirect("/onboard") in the
  // codebase, and every tab under it (/public-feed, /people, /spark, /tranche) is a
  // `return null` stub rendered by TabShell — so a deep link to any of them walked
  // straight past onboarding. Middleware is the only layer that catches that.
  //
  // Fails OPEN, unlike the age gate above. A thrown read is an infra symptom, and
  // failing closed here would dump fully-onboarded users onto /onboard during a pool
  // hiccup — worse than letting them through one extra request. The age gate keeps
  // its fail-CLOSED semantics on the very same failure, so the legal wall is
  // unaffected by this choice.
  if (user && !isExcluded && !readFailed) {
    // Same BOTH-fields rule as src/app/page.tsx. Keep them identical.
    const hasProfile = !!(
      profileRow?.display_name?.trim() && profileRow?.handle?.trim()
    );
    if (!hasProfile) {
      const target = url.clone();
      target.pathname = "/onboard";
      return NextResponse.redirect(target, 307);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
