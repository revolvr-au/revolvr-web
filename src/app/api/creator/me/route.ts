import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      const {
        data: { session },
      } = await supabase.auth.getSession();

if (error || !user) {
      return NextResponse.json(
        {
          loggedIn: false,
          accessToken: null,
            creator: {
            isActive: false,
            handle: null,
            isVerified: false,
            verificationStatus: null,
            verificationCurrentPeriodEnd: null,
            verificationTier: null,
            verificationPriceId: null,
          },
        },
        { status: 200 }
      );
    }

    const email = (user.email ?? "").trim().toLowerCase();

    const profile = email
      ? await prisma.creatorProfile.findUnique({ where: { email } })
      : null;

    const balance = email
      ? await prisma.creatorBalance.findUnique({ where: { creatorEmail: email } })
      : null;

    const verificationPriceId = profile?.verificationPriceId ?? null;
    const verificationStatusRaw = profile?.verificationStatus ?? null;
    const verificationCurrentPeriodEnd = profile?.verificationCurrentPeriodEnd ?? null;

    const bluePriceId = (process.env.STRIPE_BLUE_TICK_PRICE_ID ?? "").trim();
    const goldPriceId = (process.env.STRIPE_GOLD_TICK_PRICE_ID ?? "").trim();

    const normalizedStatus = String(verificationStatusRaw ?? "").trim().toLowerCase();
    const statusTier =
      normalizedStatus === "blue" || normalizedStatus === "gold"
        ? (normalizedStatus as "blue" | "gold")
        : null;

    const now = new Date();
    const hasActivePeriod =
      verificationCurrentPeriodEnd instanceof Date
        ? verificationCurrentPeriodEnd > now
        : verificationCurrentPeriodEnd
          ? new Date(verificationCurrentPeriodEnd as any) > now
          : false;

    // Determine tier
    const verificationTier =
      statusTier ??
      (verificationPriceId && goldPriceId && String(verificationPriceId) === String(goldPriceId)
        ? "gold"
        : verificationPriceId && bluePriceId && String(verificationPriceId) === String(bluePriceId)
          ? "blue"
          : null);

    // VERIFIED RULE (simple + robust):
    // - is_verified true OR
    // - status says blue/gold OR
    // - has an active paid period end in the future
    const isVerified = Boolean(profile?.isVerified) || statusTier !== null || hasActivePeriod;

    return NextResponse.json(
      {
        loggedIn: true,
        accessToken: session?.access_token ?? null,
          user: { id: user.id, email: email || null },
        creator: {
          isActive: profile?.status === "ACTIVE",
          handle: profile?.handle ?? null,
          isVerified,
          verificationStatus: verificationStatusRaw,
          verificationCurrentPeriodEnd,
          verificationTier,
          verificationPriceId,
        },
        profile,
        balance:
          balance ??
          (email ? { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 } : null),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[api/creator/me] error", e);

    return NextResponse.json(
      {
        loggedIn: false,
        creator: {
          isActive: false,
          handle: null,
          isVerified: false,
          verificationStatus: null,
          verificationCurrentPeriodEnd: null,
          verificationTier: null,
          verificationPriceId: null,
        },
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
