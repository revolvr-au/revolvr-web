import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserEmailFromBearer(req: Request) {
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
  return user?.email ? String(user.email).trim().toLowerCase() : null;
}

export async function POST(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return jsonError("Not authenticated", 401);

    const profile = await prisma.creatorProfile.findUnique({ where: { email } }).catch(() => null);
    if (!profile) return jsonError("Creator not found. Activate creator first.", 404);

    const existing = (profile as any).stripeAccountId || (profile as any).stripe_account_id;
    if (existing) {
      return NextResponse.json({ ok: true, stripeAccountId: existing }, { status: 200 });
    }

    const acct = await stripe.accounts.create({
      type: "express",
      country: "AU",
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
    });

    const data: any = {};
    if ("stripeAccountId" in (profile as any)) data.stripeAccountId = acct.id;
    else data.stripe_account_id = acct.id;

    if ("stripeOnboardingStatus" in (profile as any)) data.stripeOnboardingStatus = "not_started";
    else data.stripe_onboarding_status = "not_started";

    if ("stripeChargesEnabled" in (profile as any)) data.stripeChargesEnabled = false;
    else data.stripe_charges_enabled = false;

    if ("stripePayoutsEnabled" in (profile as any)) data.stripePayoutsEnabled = false;
    else data.stripe_payouts_enabled = false;

    if ("payoutCurrency" in (profile as any)) data.payoutCurrency = "aud";
    else data.payout_currency = "aud";

    await prisma.creatorProfile.update({ where: { email }, data });

    return NextResponse.json({ ok: true, stripeAccountId: acct.id }, { status: 200 });
  } catch (e: any) {
    console.error("[api/stripe/connect/create] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
