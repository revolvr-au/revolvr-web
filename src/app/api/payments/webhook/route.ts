// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const runtime = "nodejs"; // ensure Node runtime for raw body access

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // Important: use raw body for Stripe verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed.", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata || {};
      const type = metadata.type;

      switch (type) {
        case "tip":
          await handleTip(session);
          break;
        case "boost":
          await handleBoost(session);
          break;
        case "credits":
          await handleCredits(session);
          break;
        default:
          console.warn("Unknown metadata.type on session", type);
      }
    } else {
      // Ignore other event types for now
      console.log(`Unhandled event type ${event.type}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Error handling webhook:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}

/**
 * TIP HANDLER
 * - user paid to tip a creator
 */
async function handleTip(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const creatorId = md.creatorId!;
  const supporterId = md.userId || null;

  const amountTotal = session.amount_total; // in cents
  const currency = session.currency?.toUpperCase() || "AUD";

  // TODO: write to DB – example using pseudo-DB calls
  // await db.insertTip({
  //   creatorId,
  //   supporterId,
  //   amountCents: amountTotal,
  //   currency,
  //   stripePaymentId: session.payment_intent as string,
  // });

  console.log(`💸 Tip recorded: ${amountTotal} ${currency} for creator ${creatorId}`);
}

/**
 * BOOST HANDLER
 * - user paid to boost a specific post
 */
async function handleBoost(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const userId = md.userId!;
  const postId = md.postId!;

  const amountTotal = session.amount_total; // in cents
  const currency = session.currency?.toUpperCase() || "AUD";

  // Example rules: each successful boost = +1 boost_score and +24 hours
  // In DB:
  // await db.insertPostBoost({
  //   postId,
  //   userId,
  //   amountCents: amountTotal,
  //   currency,
  //   stripePaymentId: session.payment_intent as string,
  // });
  //
  // await db.incrementPostBoost({
  //   postId,
  //   hours: 24,
  //   scoreIncrement: 1,
  // });

  console.log(`🚀 Boost recorded on post ${postId} by user ${userId}`);
}

/**
 * CREDITS HANDLER
 * - user bought spinner credits
 */
async function handleCredits(session: Stripe.Checkout.Session) {
  const md = session.metadata || {};
  const userId = md.userId!;
  const creditsToAdd = parseInt(md.creditsToAdd || "0", 10);

  if (!creditsToAdd || creditsToAdd <= 0) {
    console.warn("No creditsToAdd in metadata for credits payment");
    return;
  }

  // await db.addUserCredits({ userId, amount: creditsToAdd });

  console.log(`✨ Added ${creditsToAdd} credits to user ${userId}`);
}
