import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getTierFromPriceId(priceId: string | null) {
  if (!priceId) return null;
  const blue = process.env.STRIPE_BLUE_TICK_PRICE_ID || "";
  const gold = process.env.STRIPE_GOLD_TICK_PRICE_ID || "";
  if (gold && priceId === gold) return "gold";
  if (blue && priceId === blue) return "blue";
  return null;
}

async function findProfileByCustomer(customerId: string) {
  // Prefer stored mapping
  const byId = await prisma.creatorProfile.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (byId) return byId;

  // Fallback: fetch email from Stripe customer
  const customer = await stripe.customers.retrieve(customerId);
  const email = (customer && "email" in customer ? (customer.email ?? "") : "")
    .trim()
    .toLowerCase();

  if (!email) return null;

  return prisma.creatorProfile.findUnique({ where: { email } });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Missing signature" },
      { status: 400 }
    );
  }

  const body = await req.text();

  // Support 2 webhook secrets (blue + gold) by attempting both.
  const secrets = [
  process.env.STRIPE_WEBHOOK_SECRET,              // ✅ new canonical
  process.env.STRIPE_WEBHOOK_SECRET_BLUE_TICK,    // legacy fallback
  process.env.STRIPE_WEBHOOK_SECRET_GOLD_TICK,    // legacy fallback
].filter(Boolean) as string[];


  let event: Stripe.Event | null = null;
  let lastErr: unknown = null;

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!event) {
    console.error("[stripe/webhook] signature verify failed", lastErr);
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const customerId = String(sub.customer);
      const profile = await findProfileByCustomer(customerId);

      // No profile yet? Don't fail the webhook; just acknowledge.
      if (!profile) {
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }

      // ✅ price + period end live on the subscription item in your payload
      const item = sub.items?.data?.[0];

      const priceId = item?.price?.id != null ? String(item.price.id) : null;

      const currentPeriodEnd =
        typeof item?.current_period_end === "number"
          ? new Date(item.current_period_end * 1000)
          : null;

      const status = String(sub.status); // active | trialing | canceled | etc
      const isActive = status === "active" || status === "trialing";

      await prisma.creatorProfile.update({
        where: { id: profile.id },
        data: {
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          verificationPriceId: priceId,
          verificationStatus: isActive ? "active" : "inactive",
          verificationCurrentPeriodEnd: currentPeriodEnd,
          isVerified: isActive,
          verifiedSince: isActive ? new Date() : null,
        },
      });

      return NextResponse.json(
        { ok: true, tier: getTierFromPriceId(priceId), active: isActive },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[stripe/webhook] handler error", e);
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
