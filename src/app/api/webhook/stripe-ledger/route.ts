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

  // --- IDEMPOTENCY ---
  try {
    await prisma.stripeEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ received: true });
  }

  // --- METADATA ---
  const md = session.metadata ?? {};
  const creatorEmail = md.creator_email;
  const paymentType = md.payment_type;
  const sessionId = md.session_id ?? null;

  if (!creatorEmail || !paymentType) {
    console.warn("[stripe-ledger] missing metadata", {
      eventId: event.id,
      creatorEmail,
      paymentType,
    });
    return NextResponse.json({ received: true });
  }

  // --- STRIPE FIELDS ---
  const grossCents = session.amount_total;
  const currency = session.currency;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : null;

  if (!grossCents || !currency || !paymentIntentId) {
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
  const platformCents = grossCents - creatorCents;

  // --- LEDGER + BALANCE (ATOMIC) ---
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        stripeEventId: event.id,
        stripePaymentIntentId: paymentIntentId,
        stripeSessionId: session.id,
        creatorId: creatorEmail, // mapped to existing Payment schema
        sessionId,
        type: paymentType,
        amountGross: grossCents,
        amountCreator: creatorCents,
        amountPlatform: platformCents,
        currency,
        status: "completed",
      },
    }),
    prisma.creatorBalance.upsert({
      where: { creatorEmail },
      update: {
        totalEarnedCents: { increment: creatorCents },
        availableCents: { increment: creatorCents },
      },
      create: {
        creatorEmail,
        totalEarnedCents: creatorCents,
        availableCents: creatorCents,
      },
    }),
  ]);

  return NextResponse.json({ received: true });
}
