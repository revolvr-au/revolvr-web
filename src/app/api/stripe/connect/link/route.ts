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

function appBaseUrl(req: Request) {
  const origin = (req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (!origin) throw new Error("Missing origin / NEXT_PUBLIC_SITE_URL");
  return origin;
}

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

export async function POST(req: NextRequest) {
  try {
    const email = await getUserEmailFromCookies();
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
