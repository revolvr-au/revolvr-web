import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getTierFromPriceId(priceId: string | null) {
  if (!priceId) return null;

  const blue = (process.env.STRIPE_BLUE_TICK_PRICE_ID || "").trim();
  const gold = (process.env.STRIPE_GOLD_TICK_PRICE_ID || "").trim();

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
  const email =
    (customer && "email" in customer ? (customer.email ?? "") : "")
      .trim()
      .toLowerCase();

  if (!email) return null;

  return prisma.creatorProfile.findUnique({ where: { email } });
}

function getWebhookSecrets(): string[] {
  const primary = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

  // Optional legacy fallbacks (only if still present in env)
  const blueLegacy = (process.env.STRIPE_WEBHOOK_SECRET_BLUE_TICK || "").trim();
  const goldLegacy = (process.env.STRIPE_WEBHOOK_SECRET_GOLD_TICK || "").trim();

  return [primary, blueLegacy, goldLegacy].filter(Boolean);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // IMPORTANT: must be the raw payload exactly as received
  const body = await req.text();

  const secrets = getWebhookSecrets();
  console.log("[stripe/webhook] secrets_count", secrets.length);

  if (secrets.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Missing STRIPE_WEBHOOK_SECRET env var(s)" },
      { status: 500 }
    );
  }

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

  // Always log what arrived so you can confirm routing
  console.log("[stripe/webhook] event", {
    id: event.id,
    type: event.type,
    livemode: event.livemode,
    created: event.created,
  });

  try {
    // --- Verification subscription lifecycle ---
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const customerId = String(sub.customer);
      const profile = await findProfileByCustomer(customerId);

      if (!profile) {
        console.log("[stripe/webhook] no profile for customer; ignoring", {
          customerId,
        });
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }

      const item = sub.items?.data?.[0];
      const priceId = item?.price?.id != null ? String(item.price.id) : null;

      const currentPeriodEnd =
        typeof (sub as any).current_period_end === "number"
          ? new Date(((sub as any).current_period_end as number) * 1000)
          : null;

      const status = String(sub.status);
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

      console.log("[stripe/webhook] subscription processed", {
        customerId,
        profileId: profile.id,
        priceId,
        tier: getTierFromPriceId(priceId),
        isActive,
      });

      return NextResponse.json(
        { ok: true, tier: getTierFromPriceId(priceId), active: isActive },
        { status: 200 }
      );
    }

    // --- Checkout session completed (credits/spins/etc) ---
    // Right now your app returns 200 OK but does NOT update anything.
    // This log shows whether the metadata you expect is present.
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log("[stripe/webhook] checkout.session.completed", {
        id: session.id,
        mode: session.mode,
        payment_status: session.payment_status,
        customer: session.customer,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata,
      });

      // TODO: Wire this to your credits/ledger logic (or move these events to /api/payments/webhook)
      // Example patterns:
      // - Look up the user by session.customer_email or metadata.userEmail/viewer_email
      // - Insert a ledger row
      // - Increment credits/spins
      //
      // For now, acknowledge to Stripe.
      return NextResponse.json({ ok: true }, { status: 200 });
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
