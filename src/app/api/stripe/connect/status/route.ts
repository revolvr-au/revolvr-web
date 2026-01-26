import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecret);

async function getUserEmail(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const email = (data.user.email ?? "").trim().toLowerCase();
  return email || null;
}



export async function GET(req: NextRequest) {
  try {
    const email = await getUserEmail(req);
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
