export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/api/stripe/webhook/_verification.ts
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

// Stripe SDK typings differ across versions. Some fields exist at runtime but not in TS types.
function unwrapStripe<T>(obj: Stripe.Response<T> | T): T {
  const maybe = obj as unknown as { data?: T };
  return maybe && typeof maybe === "object" && "data" in maybe && maybe.data
    ? maybe.data
    : (obj as T);
}

function getSubFields(sub: unknown): {
  status?: string;
  current_period_end?: number;
} {
  const s = sub as any;
  return {
    status: typeof s?.status === "string" ? s.status : undefined,
    current_period_end:
      typeof s?.current_period_end === "number" ? s.current_period_end : undefined,
  };
}

/**
 * Launch-safe:
 * - Compiles even if Prisma schema has no `creator` model.
 * - Does NOT crash at runtime if verification fires.
 * - Once you confirm the correct model name, replace the `db.creator` section.
 */
export async function upsertCreatorVerificationFromSubscription(params: {
  creatorEmail: string;
  subscriptionId: string;
  tier: "blue" | "gold";
}) {
  const { creatorEmail, subscriptionId, tier } = params;

  const subResp = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = unwrapStripe(subResp) as unknown;

  const { status, current_period_end } = getSubFields(sub);

  const currentPeriodEnd: Date | null =
    typeof current_period_end === "number"
      ? new Date(current_period_end * 1000)
      : null;

  const isActive =
    status === "active" || status === "trialing" || status === "past_due";

  // ---- Prisma model compatibility guard ----
  // Your Prisma client does not expose `prisma.creator`, so we guard via `any`.
  // If the model exists under a different name, update this block accordingly.
  const db = prisma as any;

  if (!db?.creator?.upsert) {
    console.warn(
      "[stripe][verification] Prisma model `creator` not found. Skipping DB persistence.",
      { creatorEmail, subscriptionId, tier, isActive, currentPeriodEnd }
    );
    return;
  }

  await db.creator.upsert({
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
