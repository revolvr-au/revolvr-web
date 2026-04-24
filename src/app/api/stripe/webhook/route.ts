import { NextResponse } from "next/server";
import { headers } from "next/headers"; // Added for Next.js 15
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("Missing STRIPE_SECRET_KEY");

  return new Stripe(apiKey, {
    apiVersion: "2025-12-15.clover" as any,
  });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  
  // ✅ FIX: Next.js 15 requires awaiting headers()
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    console.error("[Stripe Webhook] Missing signature");
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Verification failed: ${err.message}`);
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
      const onboardingStatus = chargesEnabled && payoutsEnabled ? "complete" : "pending";

      // Cleaned up data mapping to prevent Prisma field crashes
      const updateData = {
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeOnboardingStatus: onboardingStatus,
      };

      // ✅ FIX: Use a more robust update check for Creator Profiles
      await prisma.creatorProfile.updateMany({
        where: {
          stripeAccountId: stripeAccountId,
        },
        data: updateData,
      });
      
      console.log(`[Stripe Webhook] Updated account: ${stripeAccountId}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("[Stripe Webhook] Handler failed:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}