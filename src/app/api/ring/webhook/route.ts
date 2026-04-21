import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { RingTier } from "@prisma/client";

export const runtime = "nodejs";

// Maps a Stripe price ID to the RingTier it represents
function tierFromPriceId(priceId: string): RingTier | null {
  const map: Record<string, RingTier> = {
    [process.env.STRIPE_RING_BLUE_PRICE_ID      ?? "__none__"]: "BLUE",
    [process.env.STRIPE_RING_GOLD_PRICE_ID      ?? "__none__"]: "GOLD",
    [process.env.STRIPE_RING_BUSINESS_PRICE_ID  ?? "__none__"]: "BUSINESS",
    [process.env.STRIPE_RING_CORPORATE_PRICE_ID ?? "__none__"]: "CORPORATE",
    [process.env.STRIPE_RING_RED_PRICE_ID       ?? "__none__"]: "RED",
  };
  return map[priceId] ?? null;
}

function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = (sub as any).current_period_end as number | undefined;
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(req: Request) {
  const secret  = process.env.STRIPE_SECRET_KEY;
  const whsec   = process.env.STRIPE_RING_WEBHOOK_SECRET;

  if (!secret || !whsec) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-01-27.acacia" as any });
  const body   = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    console.error("[ring/webhook] signature failed:", err?.message);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Checkout completed → activate ring ──────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.purpose !== "ring") break;

        const email = session.metadata?.creatorEmail?.toLowerCase();
        if (!email) break;

        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription as any)?.id;
        if (!subId) break;

        const sub  = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0]?.price?.id;
        const tier = priceId ? tierFromPriceId(priceId) : null;
        if (!tier) {
          console.error("[ring/webhook] unknown price ID:", priceId);
          break;
        }

        const customerId =
          typeof session.customer === "string" ? session.customer : (session.customer as any)?.id;

        await prisma.creatorProfile.upsert({
          where: { email },
          update: {
            ringTier:            tier,
            ringActivatedAt:     new Date(),
            ringExpiresAt:       periodEnd(sub),
            stripeSubscriptionId: subId,
            stripeCustomerId:    customerId ?? undefined,
          },
          create: {
            email,
            displayName:         email.split("@")[0],
            status:              "ACTIVE",
            ringTier:            tier,
            ringActivatedAt:     new Date(),
            ringExpiresAt:       periodEnd(sub),
            stripeSubscriptionId: subId,
            stripeCustomerId:    customerId ?? undefined,
          },
        });

        console.log(`[ring/webhook] activated ${tier} for ${email}`);
        break;
      }

      // ── Renewal invoice paid → refresh expiry ───────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;
        if (!subId) break;

        const sub     = await stripe.subscriptions.retrieve(subId);
        const email   = sub.metadata?.creatorEmail?.toLowerCase();
        const priceId = sub.items.data[0]?.price?.id;
        const tier    = priceId ? tierFromPriceId(priceId) : null;
        if (!email || !tier) break;

        await prisma.creatorProfile.updateMany({
          where: { email },
          data: {
            ringTier:      tier,
            ringExpiresAt: periodEnd(sub),
          },
        });

        console.log(`[ring/webhook] renewed ${tier} for ${email}`);
        break;
      }

      // ── Subscription cancelled → revert to NONE ─────────────────────────
      case "customer.subscription.deleted": {
        const sub   = event.data.object as Stripe.Subscription;
        if (sub.metadata?.purpose !== "ring") break;

        const email = sub.metadata?.creatorEmail?.toLowerCase();
        if (!email) break;

        await prisma.creatorProfile.updateMany({
          where: { email },
          data: {
            ringTier:            "NONE",
            ringExpiresAt:       null,
            stripeSubscriptionId: null,
          },
        });

        console.log(`[ring/webhook] reverted to NONE for ${email}`);
        break;
      }

      // ── Subscription updated (upgrade / payment failure / pause) ─────────
      case "customer.subscription.updated": {
        const sub   = event.data.object as Stripe.Subscription;
        if (sub.metadata?.purpose !== "ring") break;

        const email   = sub.metadata?.creatorEmail?.toLowerCase();
        const priceId = sub.items.data[0]?.price?.id;
        const tier    = priceId ? tierFromPriceId(priceId) : null;
        if (!email) break;

        const isActive = ["active", "trialing"].includes(sub.status);

        await prisma.creatorProfile.updateMany({
          where: { email },
          data: {
            ringTier:      isActive && tier ? tier : "NONE",
            ringExpiresAt: isActive ? periodEnd(sub) : null,
          },
        });

        console.log(`[ring/webhook] updated ${email} → ${isActive && tier ? tier : "NONE"} (${sub.status})`);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[ring/webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
