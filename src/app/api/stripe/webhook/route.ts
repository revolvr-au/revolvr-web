import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------- Utilities -------------------------------- */

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Convert arbitrary values (including Stripe objects) into Prisma JSON-safe values.
 */
function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function toPrismaJsonObject(value: unknown): Prisma.InputJsonObject {
  return toPrismaJson(value) as Prisma.InputJsonObject;
}

function getWebhookSecrets(): string[] {
  return [
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    process.env.STRIPE_WEBHOOK_SECRET_BLUE_TICK?.trim(),
    process.env.STRIPE_WEBHOOK_SECRET_GOLD_TICK?.trim(),
  ].filter((v): v is string => Boolean(v));
}

function getInvoicePriceId(invoice: Stripe.Invoice): string | null {
  const line: any = invoice.lines?.data?.[0];

  // Stripe typings vary by version; runtime data may include price on different shapes.
  // Common locations:
  // - line.price.id (newer)
  // - line.pricing.price (some SDK typings)
  // - line.plan.id (older subscription invoices)
  const direct = line?.price?.id;
  const pricing = line?.pricing?.price;
  const plan = line?.plan?.id;

  if (typeof direct === "string" && direct) return direct;
  if (typeof pricing === "string" && pricing) return pricing;
  if (typeof plan === "string" && plan) return plan;

  return null;
}

function getInvoicePeriodEnd(invoice: Stripe.Invoice): Date | null {
  const end = invoice.lines?.data?.[0]?.period?.end;
  return typeof end === "number" ? new Date(end * 1000) : null;
}

/* -------------------------------- Stripe -------------------------------- */

const stripeSecret = process.env.STRIPE_SECRET_KEY;

const stripe = new Stripe(stripeSecret ?? "", {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
});

/* -------------------------------- Handler -------------------------------- */

export async function POST(req: Request) {
  if (!stripeSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing STRIPE_SECRET_KEY" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  // IMPORTANT: raw body required for Stripe signature verification
  const body = await req.text();
  const secrets = getWebhookSecrets();

  if (secrets.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No webhook secrets configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event | null = null;

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);

        break;
    } catch {
      // try next secret
    }
  }

  if (!event) {
    console.error("[stripe/webhook] signature verification failed");
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

    // --- Idempotency guard (Stripe retries webhooks) ------------------------
    // Record event.id; if already seen, skip side-effects.
    try {
      await prisma.stripeEvent.create({ data: { id: event.id } });
    } catch (e: any) {
      const code = e?.code || e?.cause?.code;
      if (code === "P2002") {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      console.error("[stripe/webhook] stripeEvent insert failed", e);
      // continue to avoid retry storms
    }

    try {
      await prisma.stripeEvent.create({ data: { id: event.id } as any });
    } catch (e: any) {
      const code = e?.code || e?.cause?.code;
      if (code === "P2002") {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      console.error("[stripe/webhook] stripeEvent insert failed", e);
      // continue to avoid retry storms
    }


  try {
    switch (event.type) {
      /* ===================== CHECKOUT COMPLETED ===================== */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerEmail =
          session.customer_details?.email ??
          session.customer_email ??
          session.metadata?.userEmail ??
          session.metadata?.viewer_email ??
          null;

        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        const raw = toPrismaJsonObject({
          event: {
            id: event.id,
            type: event.type,
            created: event.created,
            livemode: event.livemode,
          },
          session: toPrismaJson(session),
        });

        const metadata: Prisma.InputJsonValue | undefined =
          session.metadata ? toPrismaJson(session.metadata) : undefined;

        // 1) Always store receipt / ledger
        await prisma.stripeCheckoutReceipt.upsert({
          where: { sessionId: session.id },
          create: {
            sessionId: session.id,
            paymentIntent,
            eventId: event.id,
            livemode: Boolean(event.livemode),
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            status: session.status ?? null,
            paymentStatus: session.payment_status ?? null,
            customerEmail: customerEmail?.trim().toLowerCase() ?? null,
            metadata,
            raw,
          },
          update: {
            eventId: event.id,
            paymentIntent,
            livemode: Boolean(event.livemode),
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            status: session.status ?? null,
            paymentStatus: session.payment_status ?? null,
            customerEmail: customerEmail?.trim().toLowerCase() ?? null,
            metadata,
            raw,
          },
        });

        // 2) Verification entitlement (Blue/Gold subscription)
        const purpose = session.metadata?.purpose ?? null;
        const tier = session.metadata?.tier ?? null; // "blue" | "gold"
        const creatorId = session.metadata?.userId ?? null; // CreatorProfile.id
        const verificationPriceId = session.metadata?.priceId ?? null;

        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : null;

        const stripeSubscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        const isVerification =
          purpose === "verification" &&
          (tier === "blue" || tier === "gold") &&
          session.mode === "subscription";

        if (isVerification) {
          const updateData: Prisma.CreatorProfileUpdateInput = {
            isVerified: true,
            verifiedSince: new Date(),
            verificationStatus: tier, // <-- CRITICAL: drives ticks everywhere
            verificationPriceId,
            stripeCustomerId,
            stripeSubscriptionId,
          };

          if (creatorId) {
            await prisma.creatorProfile.update({
              where: { id: creatorId },
              data: updateData,
            });
          } else if (customerEmail) {
            await prisma.creatorProfile.update({
              where: { email: customerEmail.trim().toLowerCase() },
              data: updateData,
            });
          } else {
            console.warn(
              "[stripe/webhook] verification checkout missing creator mapping"
            );
          }
        }

        return NextResponse.json({ ok: true }, { status: 200 });
      }

      /* ===================== INVOICE PAID ===================== */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        const stripeSubscriptionId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : null;

        const stripeCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : null;

        const invoicePriceId = getInvoicePriceId(invoice);
        const periodEnd = getInvoicePeriodEnd(invoice);

        const blue = process.env.STRIPE_BLUE_TICK_PRICE_ID?.trim();
        const gold = process.env.STRIPE_GOLD_TICK_PRICE_ID?.trim();

        const tier =
          gold && invoicePriceId === gold
            ? "gold"
            : blue && invoicePriceId === blue
              ? "blue"
              : null;

        // Always keep these fields current
        const data: Prisma.CreatorProfileUpdateManyMutationInput = {
          isVerified: true,
        };
        if (invoicePriceId) data.verificationPriceId = invoicePriceId;
        if (periodEnd) data.verificationCurrentPeriodEnd = periodEnd;

        // Prefer subscription mapping, fallback to customer mapping
        if (stripeSubscriptionId) {
          await prisma.creatorProfile.updateMany({
            where: { stripeSubscriptionId },
            data,
          });

          // Upgrade-safe tier persistence:
          // - Gold can overwrite Blue/NULL (upgrade)
          // - Blue NEVER overwrites Gold (no downgrade)
          if (tier === "gold") {
            await prisma.creatorProfile.updateMany({
              where: { stripeSubscriptionId, NOT: { verificationStatus: "gold" } },
              data: { verificationStatus: "gold" },
            });
          } else if (tier === "blue") {
            await prisma.creatorProfile.updateMany({
              where: { stripeSubscriptionId, NOT: { verificationStatus: "gold" } },
              data: { verificationStatus: "blue" },
            });
          }
        } else if (stripeCustomerId) {
          await prisma.creatorProfile.updateMany({
            where: { stripeCustomerId },
            data,
          });

          if (tier === "gold") {
            await prisma.creatorProfile.updateMany({
              where: { stripeCustomerId, NOT: { verificationStatus: "gold" } },
              data: { verificationStatus: "gold" },
            });
          } else if (tier === "blue") {
            await prisma.creatorProfile.updateMany({
              where: { stripeCustomerId, NOT: { verificationStatus: "gold" } },
              data: { verificationStatus: "blue" },
            });
          }
        } else {
          console.warn("[stripe/webhook] invoice.payment_succeeded missing subscription/customer mapping");
        }

        return NextResponse.json({ ok: true }, { status: 200 });
      }
case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const stripeSubscriptionId = sub.id;
        const stripeCustomerId =
          typeof sub.customer === "string" ? sub.customer : null;

        const revokeData: Prisma.CreatorProfileUpdateManyMutationInput = {
          isVerified: false,
          verifiedSince: null,
          verificationStatus: "inactive",
          verificationPriceId: null,
          verificationCurrentPeriodEnd: null,
          stripeSubscriptionId: null,
        };

        const bySub = await prisma.creatorProfile.updateMany({
          where: { stripeSubscriptionId },
          data: revokeData,
        });

        if (bySub.count === 0 && stripeCustomerId) {
          await prisma.creatorProfile.updateMany({
            where: { stripeCustomerId },
            data: revokeData,
          });
        }

        return NextResponse.json({ ok: true }, { status: 200 });
      }

      default:
        return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch (err: unknown) {
    console.error("[stripe/webhook] handler error", getErrorMessage(err));
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
