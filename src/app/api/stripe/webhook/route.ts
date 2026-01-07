import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * Prisma Json fields require plain JSON (no class instances / typed interfaces).
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

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(stripeSecret ?? "", {
  apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion,
});

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

  try {
    // ---- CHECKOUT COMPLETED ----
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const customerEmail =
        session.customer_details?.email ??
        session.customer_email ??
        session.metadata?.userEmail ??
        session.metadata?.viewer_email ??
        null;

      const paymentIntent =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const raw = toPrismaJsonObject({
        event: {
          id: event.id,
          type: event.type,
          created: event.created,
          livemode: event.livemode,
        },
        session: toPrismaJson(session),
      });

      // Stripe metadata is Record<string, string> | null, which is JSON-safe.
      const metadata: Prisma.InputJsonValue | undefined =
        session.metadata ? toPrismaJson(session.metadata) : undefined;

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

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ---- EVERYTHING ELSE ----
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("[stripe/webhook] handler error", getErrorMessage(err));
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
