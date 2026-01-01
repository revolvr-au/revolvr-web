// src/app/api/webhook/stripe-ledger/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeSecretKey);

// Revenue split (locked)
const CREATOR_SHARE = 0.45;

// Only these should land in SupportLedger
const VALID_KINDS = new Set(["TIP", "BOOST", "SPIN", "REACTION", "VOTE"]);
const VALID_SOURCES = new Set(["FEED", "LIVE"]);

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_LEDGER_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-ledger] Missing STRIPE_LEDGER_WEBHOOK_SECRET");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing stripe-signature header", { status: 400 });

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

  // Idempotency (event-level)
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true });
  }

  const md = session.metadata ?? {};

  const creatorEmail =
    (md.creator_id || md.creatorEmail || md.creator_email || "")
      .toString()
      .trim()
      .toLowerCase() || null;

  // Normalise payment type to enum-style
  const rawType = (md.payment_type || md.mode || "").toString().trim();
  const paymentType = rawType.toUpperCase();

  const sourceRaw = (md.source || md.support_source || "FEED").toString().toUpperCase();
  const source = VALID_SOURCES.has(sourceRaw) ? sourceRaw : "FEED";

  const targetId =
    (md.target_id || md.targetId || md.session_id || md.postId || "")
      .toString()
      .trim() || null;

  const viewerEmail =
    (md.viewer_email || md.viewerEmail || md.viewer_email || "")
      .toString()
      .trim()
      .toLowerCase() || null;

  if (!creatorEmail || !paymentType) {
    console.warn("[stripe-ledger] missing metadata", {
      eventId: event.id,
      creatorEmail,
      paymentType,
      metadata: md,
    });
    return NextResponse.json({ received: true });
  }

  // Ignore packs here (credit packs should be handled elsewhere)
  if (paymentType.includes("PACK") || paymentType.endsWith("-PACK")) {
    return NextResponse.json({ received: true, ignored: "pack" });
  }

  // Only write SupportLedger for known kinds
  if (!VALID_KINDS.has(paymentType)) {
    console.warn("[stripe-ledger] unsupported paymentType", { paymentType, eventId: event.id });
    return NextResponse.json({ received: true, ignored: "unsupported_kind" });
  }

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

  const creatorCents = Math.round(grossCents * CREATOR_SHARE);
  const platformCents = Math.max(0, grossCents - creatorCents);

  const paymentId = session.id; // stable checkout session id

  try {
    await prisma.$transaction([
      prisma.payment.upsert({
        where: { id: paymentId },
        create: {
          id: paymentId,
          stripeEventId: event.id,
          stripePaymentIntentId: paymentIntentId,
          stripeSessionId: session.id,

          creatorId: creatorEmail,
          ...(targetId ? { sessionId: targetId } : {}),

          type: paymentType,
          amountGross: grossCents,
          amountCreator: creatorCents,
          amountPlatform: platformCents,
          currency,
          status: "completed",
        },
        update: {}, // keep existing record if retried
      }),

      prisma.supportLedger.create({
        data: {
          creatorEmail,
          viewerEmail,
          kind: paymentType as any, // TIP|BOOST|SPIN|REACTION|VOTE
          source: source as any, // FEED|LIVE
          targetId,
          units: 1,
          currency: currency.toUpperCase(),
          grossCents,
          creatorCents,
          platformCents,
        },
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
  } catch (err) {
    console.error("[stripe-ledger] DB write failed", err);
    // Return 200 so Stripe doesn't hammer retries while you debug
  }

  return NextResponse.json({ received: true });
}
