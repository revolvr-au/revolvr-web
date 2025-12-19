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

// Node runtime, use account default API version
const stripe = new Stripe(stripeSecretKey);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // webhookSecret is validated above, but TS still sees possible undefined
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Support BOTH your old keys and new keys (checkout metadata)
  const creatorEmail =
    session.metadata?.creatorEmail || session.metadata?.creator_id || null;

  const paymentType =
    (session.metadata?.payment_type ||
      session.metadata?.mode ||
      "unknown") as string;

  const postId = session.metadata?.postId || session.metadata?.session_id || "";

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
  const amountPlatform = Math.max(0, amountGross - amountCreator);

  const stripeEventId = event.id;

  // PaymentIntent id (ensure never empty string to satisfy required DB field)
  const stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  // you store email as the creator identifier
  const creatorId = creatorEmail;

  try {
    // Persist the payment (your schema requires these fields)
    await prisma.payment.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        stripeEventId,
        stripePaymentIntentId,
        stripeSessionId: session.id,
        creatorId,
        sessionId: postId || null,
        type: paymentType,
        amountGross,
        amountCreator,
        amountPlatform,
        currency,
        status: "completed",
      },
      update: {
        // idempotent: if Stripe retries, keep record as-is
      },
    });

// Persist creator balances (CreatorBalance unique key is creatorEmail)
await prisma.creatorBalance.upsert({
  where: { creatorEmail }, // <-- this is the unique key Prisma client expects
  create: {
    creatorEmail,
    pendingBalance: 0,
    availableBalance: amountCreator,
    lifetimeEarned: amountCreator,
  },
  update: {
    availableBalance: { increment: amountCreator },
    lifetimeEarned: { increment: amountCreator },
  },
});



    console.log("[stripe/webhook] Payment recorded", {
      sessionId: session.id,
      creatorEmail,
      buyerEmail,
      amountGross,
      amountCreator,
      amountPlatform,
      currency,
      paymentType,
      postId,
      stripeEventId,
      stripePaymentIntentId,
    });
  } catch (e) {
    console.error("[stripe/webhook] DB write failed", e);
    // Return 200 so Stripe doesn't hammer retries while you debug
  }

  return NextResponse.json({ received: true });
}
