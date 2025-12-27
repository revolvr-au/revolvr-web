import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.revolvr.net").replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return jsonError("Not authenticated", 401);

    const profile = await prisma.creatorProfile.findUnique({ where: { email } }).catch(() => null);
    if (!profile) return jsonError("Creator not found. Activate creator first.", 404);

    let stripeAccountId =
      (profile as any).stripeAccountId || (profile as any).stripe_account_id || null;

    if (!stripeAccountId) {
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

      stripeAccountId = acct.id;

      const data: any = {};
      if ("stripeAccountId" in (profile as any)) data.stripeAccountId = stripeAccountId;
      else data.stripe_account_id = stripeAccountId;

      if ("payoutCurrency" in (profile as any)) data.payoutCurrency = "aud";
      else data.payout_currency = "aud";

      await prisma.creatorProfile.update({ where: { email }, data });
    }

    const app = appBaseUrl();
    const returnUrl = `${app}/creator/payouts?status=return`;
    const refreshUrl = `${app}/creator/payouts?status=refresh`;

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    const update: any = {};
    if ("stripeOnboardingStatus" in (profile as any)) update.stripeOnboardingStatus = "pending";
    else update.stripe_onboarding_status = "pending";

    await prisma.creatorProfile.update({ where: { email }, data: update });

    return NextResponse.json({ ok: true, url: link.url }, { status: 200 });
  } catch (e: any) {
    console.error("[api/stripe/connect/link] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
