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

function appBaseUrl(req: Request) {
  const origin = (req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!origin) throw new Error("Missing origin / NEXT_PUBLIC_SITE_URL");
  return origin;
}

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

async function ensureConnectedAccount(email: string) {
  const profile = await prisma.creatorProfile.findUnique({ where: { email } });
  if (!profile) return { profile: null as any, stripeAccountId: null as string | null };

  let stripeAccountId = profile.stripeAccountId;

  if (!stripeAccountId) {
    const acct = await stripe.accounts.create({
      type: "express",
      country: "AU",
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
    });

    stripeAccountId = acct.id;

    await prisma.creatorProfile.update({
      where: { email },
      data: {
        stripeAccountId,
        payoutCurrency: "aud",
        stripeOnboardingStatus: "pending",
      },
    });
  } else {
    await prisma.creatorProfile.update({
      where: { email },
      data: { stripeOnboardingStatus: "pending" },
    });
  }

  return { profile, stripeAccountId };
}

export async function POST(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { profile, stripeAccountId } = await ensureConnectedAccount(email);
    if (!profile) return NextResponse.json({ error: "Creator not found. Activate creator first." }, { status: 404 });
    if (!stripeAccountId) return NextResponse.json({ error: "Missing Stripe account" }, { status: 500 });

    const base = appBaseUrl(req);
    const returnUrl = `${base}/creator/payouts?stripe=return`;
    const refreshUrl = `${base}/creator/payouts?stripe=refresh`;

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });

    return NextResponse.json({ ok: true, url: link.url }, { status: 200 });
  } catch (e: any) {
    console.error("[api/stripe/connect/link] error", e?.message ?? e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
