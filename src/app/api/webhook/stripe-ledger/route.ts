import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Revenue split (locked)
const CREATOR_SHARE = 0.45;

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing Stripe signature", { status: 400 });

  let event: Stripe.Event;

  try {
    const rawBody = await req.text(); // MUST be raw text
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-ledger] signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Critical: only process the single v1 event for the thin slice
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // 1) Idempotency gate (Stripe retries are normal)
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    // Duplicate delivery -> no-op
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 2) Validate minimum metadata required for attribution
  const md = session.metadata ?? {};
  const creatorId = md.creator_id;
  const paymentType = md.payment_type; // e.g. tip_single, boost_pack, etc.
  const sessionId = md.session_id ?? null;

  if (!creatorId || !paymentType) {
    console.warn("[stripe-ledger] missing required metadata", {
      eventId: event.id,
      creatorId,
      paymentType,
      sessionId,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 3) Validate Stripe fields we depend on
  const gross = session.amount_total; // integer cents
  const currency = session.currency;

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : null;

  if (!gross || !currency || !paymentIntentId) {
    console.warn("[stripe-ledger] missing required Stripe fields", {
      eventId: event.id,
      gross,
      currency,
      paymentIntentId,
    });
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 4) Compute split (integer cents; creator gets 45%)
  const amountCreator = Math.round(gross * CREATOR_SHARE);
  const amountPlatform = gross - amountCreator;

  // 5) Write ledger + update balance atomically
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        stripeEventId: event.id,
        stripePaymentIntentId: paymentIntentId,
        stripeSessionId: session.id,
        creatorId,
        sessionId,
        type: paymentType,
        amountGross: gross,
        amountCreator,
        amountPlatform,
        currency,
        status: "completed",
      },
    }),
    prisma.creatorBalance.upsert({
      where: { creatorId },
      update: {
        pendingBalance: { increment: amountCreator },
        lifetimeEarned: { increment: amountCreator },
      },
      create: {
        creatorId,
        pendingBalance: amountCreator,
        availableBalance: 0,
        lifetimeEarned: amountCreator,
      },
    }),
  ]);

  return NextResponse.json({ received: true }, { status: 200 });
}
