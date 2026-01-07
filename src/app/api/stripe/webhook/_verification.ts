// src/app/api/stripe/webhook/_verification.ts
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

// Stripe SDK sometimes returns Stripe.Response<T> (with .data) depending on version/types.
// Normalize it to the actual object.
function unwrapStripe<T>(obj: Stripe.Response<T> | T): T {
  const maybe = obj as unknown as { data?: T };
  return (maybe && typeof maybe === "object" && "data" in maybe && maybe.data)
    ? maybe.data
    : (obj as T);
}

// NOTE: keep your existing exports/signature if referenced elsewhere.
// If your project imports a different function name from this file,
// keep that name and replace only the internals.

export async function upsertCreatorVerificationFromSubscription(params: {
  creatorEmail: string;
  subscriptionId: string;
  tier: "blue" | "gold";
}) {
  const { creatorEmail, subscriptionId, tier } = params;

  // Retrieve subscription
  const subResp = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = unwrapStripe(subResp);

  const currentPeriodEnd: Date | null =
    typeof sub.current_period_end === "number"
      ? new Date(sub.current_period_end * 1000)
      : null;

  const isActive =
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due";

  // Persist on your Creator row (adjust fields if your schema differs)
  await prisma.creator.upsert({
    where: { email: creatorEmail },
    create: {
      email: creatorEmail,
      isVerified: isActive,
      verificationTier: tier,
      verificationSubscriptionId: subscriptionId,
      verificationPeriodEnd: currentPeriodEnd,
    },
    update: {
      isVerified: isActive,
      verificationTier: tier,
      verificationSubscriptionId: subscriptionId,
      verificationPeriodEnd: currentPeriodEnd,
    },
  });
}
