// src/app/api/payments/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs"; // ensures Node runtime for this route

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    console.error("❌ STRIPE_SECRET_KEY is not set");
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  // Stripe sends the raw body + signature header
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      // ✅ Properly verify webhook when secret is available
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // 🟡 Fallback for local testing without webhook secret:
      // try to parse JSON directly (useful if you call this manually)
      event = JSON.parse(rawBody) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("❌ Error verifying Stripe webhook:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 🔍 You can inspect event.type here and branch later.
  // For now, we just log and return 200 so builds + deploys work.
  console.log("✅ Received Stripe event:", event.type);

  // TODO: later:
  // if (event.type === "checkout.session.completed") {
  //   const session = event.data.object as Stripe.Checkout.Session;
  //   const metadata = session.metadata || {};
  //   // handle tip/boost/credits based on metadata.type
  // }

  return new NextResponse("ok", { status: 200 });
}
