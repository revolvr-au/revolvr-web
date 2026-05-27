// src/app/api/payments/checkout/route.ts

import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

type Body = {
  tier: "blue" | "gold";
  creatorProfileId?: string | null;
  creatorEmail?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    // ✅ SAFE Stripe init (runtime only)
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      console.warn("Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);

    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    const tier: "blue" | "gold" = body.tier === "gold" ? "gold" : "blue";

    const priceId =
      tier === "gold"
        ? process.env.STRIPE_GOLD_TICK_PRICE_ID
        : process.env.STRIPE_BLUE_TICK_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing STRIPE_${tier.toUpperCase()}_TICK_PRICE_ID` },
        { status: 500 }
      );
    }

    // Resolve creator
    let creator:
      | null
      | { id: string; email: string | null; verificationStatus: string | null } =
      null;

    if (body.creatorProfileId) {
      creator = await prisma.creatorProfile.findUnique({
        where: { id: String(body.creatorProfileId) },
        select: { id: true, email: true, verificationStatus: true },
      });
    } else if (body.creatorEmail) {
      const email = String(body.creatorEmail).trim().toLowerCase();

      creator = await prisma.creatorProfile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, verificationStatus: true },
      });

      // Create if missing
      if (!creator) {
        creator = await prisma.creatorProfile.create({
          data: {
            displayName: email.split("@")[0] || "creator",
            email,
            status: "ACTIVE",
          },
          select: { id: true, email: true, verificationStatus: true },
        });
      }
    }

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      );
    }

    // Prevent downgrade
    const current = String(creator.verificationStatus || "").toLowerCase();
    if (current === "gold" && tier === "blue") {
      return NextResponse.json(
        { error: "Gold users cannot downgrade to Blue." },
        { status: 400 }
      );
    }

    const successUrl = new URL(
      `/creator?verified=success&tier=${tier}`,
      SITE_URL
    );

    const cancelUrl = new URL(
      "/creator?verified=cancel",
      SITE_URL
    );

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      customer_email: creator.email ?? undefined,
      metadata: {
        purpose: "verification",
        tier,
        userId: creator.id,
        priceId,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[payments/checkout]", err);

    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}