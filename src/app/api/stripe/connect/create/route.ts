import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(secret, {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: "missing supabase env" }, { status: 500 });
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: auth,
      apikey: supabaseAnon,
    },
    cache: "no-store",
  });

  if (!userRes.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await userRes.json();
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "missing email" }, { status: 400 });

  const creator = await prisma.creatorProfile.findUnique({ where: { email } });
  if (!creator) {
    return NextResponse.json({ error: "not a creator" }, { status: 403 });
  }

  const origin = (req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!origin) return NextResponse.json({ error: "missing origin" }, { status: 500 });

  let stripeAccountId = creator.stripeAccountId;

  // Create Stripe account if missing
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email,
      country: "AU",
      capabilities: {
        transfers: { requested: true },
      },
    });

    stripeAccountId = account.id;

    await prisma.creatorProfile.update({
      where: { email },
      data: {
        stripeAccountId,
        stripeOnboardingStatus: "started",
      },
    });
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    refresh_url: `${origin}/creator?stripe=refresh`,
    return_url: `${origin}/creator?stripe=return`,
  });

  return NextResponse.json({ url: accountLink.url });
}
