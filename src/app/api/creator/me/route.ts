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

    const isVerified = Boolean((profile as any)?.isVerified);
    const verificationStatus = (profile as any)?.verificationStatus ?? null;
    const verificationCurrentPeriodEnd = (profile as any)?.verificationCurrentPeriodEnd ?? null;
    const verificationPriceId =
      (profile as any)?.verificationPriceId ??
      (profile as any)?.verification_price_id ??
      null;

    const bluePriceId = process.env.STRIPE_BLUE_TICK_PRICE_ID || "";
    const goldPriceId = process.env.STRIPE_GOLD_TICK_PRICE_ID || "";

    const verificationTier =
      verificationPriceId && goldPriceId && String(verificationPriceId) === String(goldPriceId)
        ? "gold"
        : verificationPriceId && bluePriceId && String(verificationPriceId) === String(bluePriceId)
          ? "blue"
          : verificationPriceId
            ? "blue"
            : null;

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
        },
        error: "Server error",
      },
      { status: 500 }
    );
  }
}
