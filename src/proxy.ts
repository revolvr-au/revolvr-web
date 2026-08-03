import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveAgeRouting } from "@/lib/ageGate";
import { normalizeEmail } from "@/lib/dm";
import {
  ANON_AGE_EXEMPT_PREFIXES,
  EXCLUDED_PREFIXES,
  ONBOARDING_EXEMPT_PREFIXES,
  matchesPrefix,
} from "@/lib/routeGates";
import { ANON_AGE_COOKIE } from "@/lib/anonAgeCookie";

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
  const isExcluded = matchesPrefix(pathname, EXCLUDED_PREFIXES);
  // Age gate still applies here, so this must NOT suppress the read below.
  const isOnboardingExempt = matchesPrefix(pathname, ONBOARDING_EXEMPT_PREFIXES);
  // Anonymous-only age-gate exemption: the redirect-only front door. Authed users are
  // unaffected by this flag.
  const isAnonAgeExempt = matchesPrefix(pathname, ANON_AGE_EXEMPT_PREFIXES);

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
  // Inert by default — only when AGE_GATE_ENABLED is explicitly "true".
  //
  // Applies to AUTHENTICATED AND ANONYMOUS visitors. It used to be authed-only, on the
  // reasoning that auth is enforced elsewhere — but /public-feed is a public surface, so
  // "elsewhere" never ran and an anonymous AU visitor read gated content without ever
  // being asked. An age wall that only applies after sign-up is not an age wall.
  //
  // The two branches differ only in WHERE the verdict is stored: authed reads
  // profiles.age_status (already fetched above), anonymous reads its own cookie. Both
  // resolve through the same fail-closed resolveAgeRouting, so an absent verdict means
  // NEEDS_VERIFICATION on either path. Anonymous costs NO database read, which matters
  // on a 5-connection pool now that the gate runs for untrusted traffic too.
  const skipAgeGate = isExcluded || (!user && isAnonAgeExempt);

  if (process.env.AGE_GATE_ENABLED === "true" && !skipAgeGate) {
    // Jurisdiction scope: the gate is AU-only. Country is derived from the Vercel
    // edge header (set upstream of app code, unspoofable by the browser) — never
    // from client input. Non-AU visitors pass through untouched: no DOB wall,
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
      // Fail-CLOSED on every failure mode. For an authed user a missing row / null
      // status funnels through resolveAgeRouting, and a THROWN read (DB unreachable /
      // pool timeout) becomes the same undefined -> verify path, so a DB hiccup degrades
      // to a clean /age-verification redirect instead of a site-wide 500. For an
      // anonymous visitor a missing or tampered cookie value hits the same default.
      const routing = user
        ? resolveAgeRouting(readFailed ? undefined : profileRow?.age_status)
        : resolveAgeRouting(request.cookies.get(ANON_AGE_COOKIE)?.value);

      if (routing === "NEEDS_VERIFICATION") {
        const target = url.clone();
        target.pathname = "/age-verification";
        // Hand the blocked destination forward so clearing the wall lands them where
        // they were going. Without this, an anonymous visitor clears the gate and gets
        // bounced to "/" -> /welcome, i.e. back to the front door they just left.
        // /age-verification re-validates this value before using it (safeNextPath).
        target.search = "";
        target.searchParams.set("next", pathname + url.search);
        return NextResponse.redirect(target, 307);
      }
      if (routing === "EXCLUDED") {
        const target = url.clone();
        target.pathname = "/underage";
        target.search = "";
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
  //
  // ONBOARDING_EXEMPT_PREFIXES applies here and nowhere else: watching is open to an
  // un-onboarded user, broadcasting (/go-live) is not.
  if (user && !isExcluded && !isOnboardingExempt && !readFailed) {
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
