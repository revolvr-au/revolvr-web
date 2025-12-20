// src/app/api/webhook/stripe-ledger/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Node runtime, use account default API version
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeSecretKey);

// Revenue split (locked)
const CREATOR_SHARE = 0.45;

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_LEDGER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-ledger] Missing STRIPE_LEDGER_WEBHOOK_SECRET");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-ledger] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // --- IDEMPOTENCY (event-level) ---
  // If Stripe retries the same event, this insert will fail and we no-op safely.
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ received: true });
  }

  // --- METADATA (support old + new keys) ---
  const md = session.metadata ?? {};

  const creatorEmail =
    md.creator_id || md.creatorEmail || md.creator_email || null;

  const paymentType = md.payment_type || md.mode || null;

  // This is your internal "target id" (postId / live session / etc)
  const internalSessionId = md.session_id || md.postId || null;

  if (!creatorEmail || !paymentType) {
    console.warn("[stripe-ledger] missing metadata", {
      eventId: event.id,
      creatorEmail,
      paymentType,
      metadata: md,
    });
    return NextResponse.json({ received: true });
  }

  // --- STRIPE FIELDS ---
  const grossCents = session.amount_total ?? 0;
  const currency = (session.currency ?? "aud").toLowerCase();

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";

  if (!grossCents || !paymentIntentId) {
    console.warn("[stripe-ledger] missing stripe fields", {
      eventId: event.id,
      grossCents,
      currency,
      paymentIntentId,
    });
    return NextResponse.json({ received: true });
  }

  // --- SPLIT ---
  const creatorCents = Math.round(grossCents * CREATOR_SHARE);
  const platformCents = Math.max(0, grossCents - creatorCents);

  const paymentId = session.id; // Stripe Checkout Session ID (stable)

await prisma.$transaction([
  prisma.payment.upsert({
    where: { id: paymentId },
    create: {
      id: paymentId,
      stripeEventId: event.id,
      stripePaymentIntentId: paymentIntentId,
      stripeSessionId: session.id,

      creatorId: creatorEmail,
      sessionId: internalSessionId,

      type: paymentType,
      amountGross: grossCents,
      amountCreator: creatorCents,
      amountPlatform: platformCents,
      currency,
      status: "completed",
    },
    update: {}, // keep existing record if retried
  }),

  prisma.creatorBalance.upsert({
    where: { creatorEmail },
    create: {
      creatorEmail,
      totalEarnedCents: creatorCents,
      availableCents: creatorCents,
    },
    update: {
      totalEarnedCents: { increment: creatorCents },
      availableCents: { increment: creatorCents },
    },
  }),
]);
