import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

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

    if (error || !user) {
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
        },
        { status: 200 }
      );
    }

    const email = (user.email ?? "").trim().toLowerCase();

    const profile = email
      ? await prisma.creatorProfile.findUnique({ where: { email } })
      : null;

    const balance = email
      ? await prisma.creatorBalance.findUnique({
          where: { creatorEmail: email },
        })
      : null;

    const verificationPriceId = profile?.verificationPriceId ?? null;
    const verificationStatus = profile?.verificationStatus ?? null;
    const verificationCurrentPeriodEnd =
      profile?.verificationCurrentPeriodEnd ?? null;
    const bluePriceId = (process.env.STRIPE_BLUE_TICK_PRICE_ID ?? "").trim();
    const goldPriceId = (process.env.STRIPE_GOLD_TICK_PRICE_ID ?? "").trim();

    const normalizedStatus = String(verificationStatus ?? "").trim().toLowerCase();
    const statusTier =
      normalizedStatus === "blue" || normalizedStatus === "gold"
        ? (normalizedStatus as "blue" | "gold")
        : null;

    // Tier can be derived either from explicit status OR from the price id (env-mapped)
    const verificationTier =
      statusTier ??
      (verificationPriceId &&
      goldPriceId &&
      String(verificationPriceId) === String(goldPriceId)
        ? "gold"
        : verificationPriceId &&
          bluePriceId &&
          String(verificationPriceId) === String(bluePriceId)
          ? "blue"
          : null);

    // Canonical: trust webhook-updated isVerified; also treat blue/gold as verified
    const isVerified =
      Boolean(profile?.isVerified) ||
      statusTier !== null ||
      (normalizedStatus === "active" && !!verificationCurrentPeriodEnd);


    return NextResponse.json(
      {
        loggedIn: true,
        user: { id: user.id, email: email || null },
        creator: {
          isActive: profile?.status === "ACTIVE",
          handle: profile?.handle ?? null,
          isVerified,
          verificationStatus,
          verificationCurrentPeriodEnd,
          verificationTier,
          verificationPriceId,
        },
        profile,
        balance:
          balance ??
          (email
            ? { creatorEmail: email, totalEarnedCents: 0, availableCents: 0 }
            : null),
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
