import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
});

async function getUserEmailFromBearer(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!apikey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const user = await res.json().catch(() => null);
  const email = user?.email ? String(user.email).trim().toLowerCase() : null;
  return email || null;
}

export async function GET(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
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
