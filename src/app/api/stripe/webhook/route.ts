// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

const stripe = new Stripe(stripeSecretKey);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Support BOTH your old keys and new keys
    const creatorEmail =
      session.metadata?.creatorEmail ||
      session.metadata?.creator_id ||
      null;

    const paymentType =
      (session.metadata?.payment_type ||
        session.metadata?.mode ||
        "unknown") as string;

    const postId =
      session.metadata?.postId ||
      session.metadata?.session_id ||
      "";

    // Stripe truth for buyer email
    const buyerEmail =
      session.customer_details?.email ||
      session.customer_email ||
      session.metadata?.userEmail ||
      null;

    const amountGross = session.amount_total ?? 0; // cents
    const currency = (session.currency ?? "aud").toLowerCase();

    if (!creatorEmail) {
      console.warn("[stripe/webhook] missing creator identifier in metadata", {
        sessionId: session.id,
        metadata: session.metadata,
      });
      return NextResponse.json({ received: true });
    }

    // Choose your creator share rule (example: 70%)
    const amountCreator = Math.round(amountGross * 0.7);

    try {
      // Idempotency: use session.id as Payment.id to avoid duplicates on retries
      await prisma.payment.upsert({
        where: { id: session.id },
        create: {
          id: session.id,
          creatorId: creatorEmail,      // you store email in creatorId currently
          amountGross,
          amountCreator,
          currency,
          type: paymentType,
          // if your schema has these fields, include them; otherwise remove:
          // buyerEmail,
          // postId,
        },
        update: {}, // nothing; if it already exists, keep it
      });

      await prisma.creatorBalance.upsert({
        where: { creatorEmail },
        create: {
          creatorEmail,
          totalEarnedCents: amountCreator,
          availableCents: amountCreator,
        },
        update: {
          totalEarnedCents: { increment: amountCreator },
          availableCents: { increment: amountCreator },
        },
      });

      console.log("[stripe/webhook] Payment recorded", {
        sessionId: session.id,
        creatorEmail,
        buyerEmail,
        amountGross,
        amountCreator,
        currency,
        paymentType,
        postId,
      });
    } catch (e) {
      console.error("[stripe/webhook] DB write failed", e);
      // Return 200 so Stripe doesn't hammer retries while you debug,
      // OR return 500 if you want Stripe to retry automatically.
    }
  }

  return NextResponse.json({ received: true });
}
