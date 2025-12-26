import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === "account.updated") {
      const acct = event.data.object as Stripe.Account;

      const stripeAccountId = acct.id;
      const chargesEnabled = !!acct.charges_enabled;
      const payoutsEnabled = !!acct.payouts_enabled;

      const onboardingStatus =
        chargesEnabled && payoutsEnabled ? "complete" : "pending";

      const data: any = {};

      if ("stripeChargesEnabled" in acct) {
        data.stripeChargesEnabled = chargesEnabled;
        data.stripePayoutsEnabled = payoutsEnabled;
        data.stripeOnboardingStatus = onboardingStatus;
      } else {
        data.stripe_charges_enabled = chargesEnabled;
        data.stripe_payouts_enabled = payoutsEnabled;
        data.stripe_onboarding_status = onboardingStatus;
      }

      await prisma.creatorProfile.updateMany({
        where: {
          OR: [
            { stripeAccountId: stripeAccountId },
            { stripe_account_id: stripeAccountId },
          ] as any,
        },
        data,
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("[stripe/webhook] handler failed", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
