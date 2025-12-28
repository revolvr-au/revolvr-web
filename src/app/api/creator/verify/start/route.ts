import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !apikey) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json().catch(() => null);
}

type Tier = "blue" | "gold";

function normalizeTier(v: unknown): Tier {
  const t = String(v ?? "").trim().toLowerCase();
  return t === "gold" ? "gold" : "blue";
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromBearer(req);
    const email = user?.email?.toLowerCase();
    if (!email) return jsonError("unauthenticated", 401);

    
    const body = await req.json().catch(() => ({}));
    const tier = normalizeTier((body as any).tier);

    const secret = process.env.STRIPE_SECRET_KEY;
    const bluePriceId = process.env.STRIPE_BLUE_TICK_PRICE_ID;
    const goldPriceId = process.env.STRIPE_GOLD_TICK_PRICE_ID; // add this in Vercel
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

    if (!secret) return jsonError("missing STRIPE_SECRET_KEY", 500);
    if (!bluePriceId) return jsonError("missing STRIPE_BLUE_TICK_PRICE_ID", 500);
    if (!goldPriceId) return jsonError("missing STRIPE_GOLD_TICK_PRICE_ID", 500);

    const priceId = tier === "gold" ? goldPriceId : bluePriceId;

    const stripe = new Stripe(secret, { apiVersion: "2025-01-27.acacia" as any });

    // Ensure creator profile exists (safe backstop)
    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: email.split("@")[0],
        handle: null,
        status: "ACTIVE",
      },
    });

    // Reuse existing customer if present
    const existingCustomerId =
      (profile as any).stripeCustomerId ||
      (profile as any).stripe_customer_id ||
      null;

    let customerId = existingCustomerId as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;

      const data: any = {};
      if ("stripeCustomerId" in (profile as any)) data.stripeCustomerId = customerId;
      else data.stripe_customer_id = customerId;

      await prisma.creatorProfile.update({ where: { email }, data });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId!,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/creator/dashboard?verified=success`,
      cancel_url: `${siteUrl}/creator/dashboard?verified=cancel`,
      metadata: {
        purpose: "verification",
        tier,
        creator_email: email,
      },
      subscription_data: {
        metadata: {
          purpose: "verification",
          tier,
          creator_email: email,
        },
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error("[creator/verify/start]", e);
    return NextResponse.json(
      { error: e.code || e.message || "Server error" },
      { status: 500 }
    );
  }
}
