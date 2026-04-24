import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { RingTier } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const PRICE_ID: Partial<Record<RingTier, string | undefined>> = {
  BLUE:      process.env.STRIPE_RING_BLUE_PRICE_ID,
  GOLD:      process.env.STRIPE_RING_GOLD_PRICE_ID,
  BUSINESS:  process.env.STRIPE_RING_BUSINESS_PRICE_ID,
  CORPORATE: process.env.STRIPE_RING_CORPORATE_PRICE_ID,
  RED:       process.env.STRIPE_RING_RED_PRICE_ID,
};

// Tier order for upgrade/downgrade validation
const TIER_RANK: Record<RingTier, number> = {
  NONE:       0,
  BLUE:       1,
  GOLD:       2,
  BUSINESS:   3,
  CORPORATE:  4,
  RED:        5,
  GOVERNMENT: 6,
};

const PAID_TIERS = new Set<RingTier>(["BLUE", "GOLD", "BUSINESS", "CORPORATE", "RED"]);

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

// Auth - Next.js 15/16 Async Handshake
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Safe to ignore in API routes
          }
        },
      },
    }
  );

  // ✅ Changed variable name to authSession to avoid collision
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const user = authSession?.user;

  if (!user?.email) {
    console.error("[Checkout] No active session found");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  let body: { tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const tier = String(body.tier ?? "").toUpperCase() as RingTier;

  // Validate tier is a purchasable paid tier
  if (!PAID_TIERS.has(tier)) {
    if (tier === "RED") {
      return NextResponse.json({ error: "Red Ring is invite-only. Contact Revolvr to apply." }, { status: 403 });
    }
    if (tier === "GOVERNMENT") {
      return NextResponse.json({ error: "Government Ring is granted manually. Contact revolvrassist@gmail.com." }, { status: 403 });
    }
    return NextResponse.json({ error: "Invalid ring tier" }, { status: 400 });
  }

  // Red Ring — invite only regardless
  if (tier === "RED") {
    return NextResponse.json({ error: "Red Ring is invite-only. Contact Revolvr to apply." }, { status: 403 });
  }

  const priceId = PRICE_ID[tier];
  if (!priceId) {
    return NextResponse.json({ error: `Price not configured for ${tier} ring. Contact support.` }, { status: 500 });
  }

  // Load creator profile
  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      ringTier: true,
      voltage: true,
      voltageQualified: true,
      stripeCustomerId: true,
    },
  });

  if (!creator) {
    return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
  }

  // Prevent downgrade
  const currentRank = TIER_RANK[creator.ringTier ?? "NONE"];
  const targetRank  = TIER_RANK[tier];
  if (targetRank < currentRank) {
    return NextResponse.json(
      { error: `Cannot downgrade from ${creator.ringTier} to ${tier}. Manage your subscription via Stripe.` },
      { status: 400 }
    );
  }

  // Gold requires voltage >= 50 (unless manually qualified)
  if (tier === "GOLD" && !creator.voltageQualified && (creator.voltage ?? 0) < 50) {
    return NextResponse.json(
      { error: "Gold Ring requires a Voltage score of 50 or more. Keep creating to unlock it." },
      { status: 403 }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" as any });

  // Upsert Stripe customer
  let customerId = creator.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { creatorId: creator.id },
    });
    customerId = customer.id;
    await prisma.creatorProfile.update({
      where: { email },
      data: { stripeCustomerId: customerId },
    });
  }

  const successUrl = new URL(`/rings?success=1&tier=${tier}`, SITE_URL);
  const cancelUrl  = new URL(`/rings?cancelled=1`, SITE_URL);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl.toString(),
    cancel_url:  cancelUrl.toString(),
    subscription_data: {
      metadata: {
        purpose:      "ring",
        tier,
        creatorEmail: email,
      },
    },
    metadata: {
      purpose:      "ring",
      tier,
      creatorEmail: email,
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}
