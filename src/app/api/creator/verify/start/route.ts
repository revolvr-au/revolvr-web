import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type Tier = "blue" | "gold";

function normalizeTier(v: unknown): Tier {
  return String(v ?? "").toLowerCase() === "gold" ? "gold" : "blue";
}

type CreatorMeResponse =
  | { user?: { email?: string | null } | null }
  | null
  | undefined;

function logError(context: string, err: unknown) {
  if (err instanceof Error) {
    console.error(context, err.message, err.stack);
    return;
  }
  console.error(context, err);
}

export async function POST(req: Request) {
  try {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    if (!siteUrl) return jsonError("missing NEXT_PUBLIC_SITE_URL", 500);

    // Auth via existing session cookie -> /api/creator/me
    const meRes = await fetch(`${siteUrl}/api/creator/me`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    });

    const me = (await meRes.json().catch(() => null)) as CreatorMeResponse;
    const email = me?.user?.email?.toLowerCase();
    if (!email) return jsonError("unauthenticated", 401);

    const body = (await req.json().catch(() => ({}))) as { tier?: unknown };
    const tier = normalizeTier(body.tier);

    const secret = process.env.STRIPE_SECRET_KEY;
    const bluePriceId = process.env.STRIPE_BLUE_TICK_PRICE_ID;
    const goldPriceId = process.env.STRIPE_GOLD_TICK_PRICE_ID;

    if (!secret || !bluePriceId || !goldPriceId) {
      return jsonError("missing stripe env", 500);
    }

    const priceId = tier === "gold" ? goldPriceId : bluePriceId;

    const stripe = new Stripe(secret, {
      apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
    });

    const profile = await prisma.creatorProfile.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: email.split("@")[0],
        status: "ACTIVE",
      },
    });

    let customerId = profile.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;

      await prisma.creatorProfile.update({
        where: { email },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
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

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    logError("[creator/verify/start]", e);
    return jsonError("server_error", 500);
  }
}
