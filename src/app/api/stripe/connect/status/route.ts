import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
});

async function getUserEmailFromCookies(): Promise<string | null> {
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

  if (error || !user) return null;

  const email = (user.email ?? "").trim().toLowerCase();
  return email || null;
}

export async function GET(req: NextRequest) {
  try {
    const email = await getUserEmailFromCookies();
    if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const profile = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!profile) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

    if (!profile.stripeAccountId) {
      return NextResponse.json(
        {
          ok: true,
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          onboardingStatus: profile.stripeOnboardingStatus ?? null,
        },
        { status: 200 }
      );
    }

    const acct = await stripe.accounts.retrieve(profile.stripeAccountId);

    const chargesEnabled = Boolean((acct as any).charges_enabled);
    const payoutsEnabled = Boolean((acct as any).payouts_enabled);
    const detailsSubmitted = Boolean((acct as any).details_submitted);

    await prisma.creatorProfile.update({
      where: { email },
      data: {
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeOnboardingStatus: chargesEnabled && payoutsEnabled ? "complete" : "pending",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        connected: true,
        stripeAccountId: profile.stripeAccountId,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        onboardingStatus: chargesEnabled && payoutsEnabled ? "complete" : "pending",
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[api/stripe/connect/status] error", e?.message ?? e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
