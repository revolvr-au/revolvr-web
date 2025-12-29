import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { Stripe as StripeTypes } from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET_GOLD_TICK;

  if (!secret || !whsec) {
    return NextResponse.json({ error: "missing stripe env" }, { status: 500 });
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-01-27.acacia" as any });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec);
  } catch (err: any) {
    console.error("[stripe/verification/gold] signature verify failed", err?.message);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const isVerificationPurpose = (purpose?: string | null) => {
    const p = String(purpose || "").toLowerCase();
    return p === "verification" || p === "blue_tick";
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (!isVerificationPurpose(session.metadata?.purpose)) break;

        const email = session.metadata?.creator_email?.toLowerCase();
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (!email || !subscriptionId) break;

        const subResp = await stripe.subscriptions.retrieve(subscriptionId);
        const sub: StripeTypes.Subscription = (subResp as any).data ?? (subResp as any);

        const currentPeriodEnd = (sub as any).current_period_end
          ? new Date(((sub as any).current_period_end as number) * 1000)
          : null;

        const verificationPriceId = (sub.items?.data?.[0]?.price?.id as string) || null;

        await prisma.creatorProfile.upsert({
          where: { email },
          update: {
            isVerified: true,
            verifiedSince: new Date(),
            stripeCustomerId: (customerId ?? undefined) as any,
            stripeSubscriptionId: subscriptionId,
            verificationPriceId,
            verificationStatus: (sub.status || "active") as any,
            verificationCurrentPeriodEnd: currentPeriodEnd as any,
          },
          create: {
            email,
            displayName: email.split("@")[0],
            handle: null,
            status: "ACTIVE",
            isVerified: true,
            verifiedSince: new Date(),
            stripeCustomerId: (customerId ?? null) as any,
            stripeSubscriptionId: subscriptionId,
            verificationPriceId,
            verificationStatus: (sub.status || "active") as any,
            verificationCurrentPeriodEnd: currentPeriodEnd as any,
          },
        });

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        const subId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

        if (!subId) break;

        const subResp = await stripe.subscriptions.retrieve(subId);
        const sub: StripeTypes.Subscription = (subResp as any).data ?? (subResp as any);

        if (!isVerificationPurpose(sub.metadata?.purpose)) break;

        const email = sub.metadata?.creator_email?.toLowerCase();
        if (!email) break;

        const currentPeriodEnd = (sub as any).current_period_end
          ? new Date(((sub as any).current_period_end as number) * 1000)
          : null;

        const verificationPriceId = (sub.items?.data?.[0]?.price?.id as string) || null;

        await prisma.creatorProfile.updateMany({
          where: { email },
          data: {
            isVerified: true,
            verificationPriceId,
            verificationStatus: (sub.status || "active") as any,
            verificationCurrentPeriodEnd: currentPeriodEnd as any,
          },
        });

        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as StripeTypes.Subscription;
        if (!isVerificationPurpose(sub.metadata?.purpose)) break;

        const email = sub.metadata?.creator_email?.toLowerCase();
        if (!email) break;

        const isActive = ["active", "trialing"].includes(sub.status);

        const currentPeriodEnd = (sub as any).current_period_end
          ? new Date(((sub as any).current_period_end as number) * 1000)
          : null;

        const verificationPriceId =
          ((sub as any).items?.data?.[0]?.price?.id as string) || null;

        await prisma.creatorProfile.updateMany({
          where: { email },
          data: {
            isVerified: isActive,
            verificationPriceId,
            verificationStatus: (sub.status || "inactive") as any,
            verificationCurrentPeriodEnd: currentPeriodEnd as any,
          },
        });

        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    console.error("[stripe/verification/gold] handler error", e);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
