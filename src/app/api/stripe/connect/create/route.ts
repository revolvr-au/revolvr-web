import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) throw new Error("Missing STRIPE_SECRET_KEY");

// You can keep apiVersion if you want, but it’s not required.
// (Leaving it is fine if it’s valid in your Stripe package.)
const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-12-15.clover" as Stripe.LatestApiVersion,
});

function appBaseUrl(req: NextRequest) {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/$/, "");
  if (env) {
    if (!env.startsWith("http")) throw new Error(`NEXT_PUBLIC_SITE_URL must include https:// (got: ${env})`);
    return env;
  }

  const origin = req.nextUrl.origin.replace(/\/$/, "");
  if (!origin.startsWith("http")) throw new Error(`Invalid origin: ${origin}`);
  return origin;
}

async function getUserEmailFromBearer(req: NextRequest): Promise<string | null> {
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
      capabilities: { transfers: { requested: true } },
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

async function onboardingLink(req: NextRequest, stripeAccountId: string) {
  const base = appBaseUrl(req);

  const returnUrl = `${base}/me?stripe=return`;
  const refreshUrl = `${base}/me?stripe=refresh`;

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });

  return link.url;
}

export async function POST(req: NextRequest) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { profile, stripeAccountId } = await ensureConnectedAccount(email);
    if (!profile) return NextResponse.json({ error: "Creator not found. Activate creator first." }, { status: 404 });

    // Gate: must accept creator terms before starting Stripe onboarding
    if (!profile.creatorTermsAccepted) {
      return NextResponse.json(
        {
          ok: false,
          error: "terms_required",
          redirectTo: "/creator/terms?returnTo=%2Fcreator%2Fonboard",
        },
        { status: 409 }
      );
    }
    if (!stripeAccountId) return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });

    const url = await onboardingLink(req, stripeAccountId);
    return NextResponse.json({ ok: true, url }, { status: 200 });
  } catch (e: any) {
    console.error("[api/stripe/connect/create] error", e);
    // For now return the real message so we can finish hardening:
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
