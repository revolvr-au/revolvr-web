import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getWebhookSecrets(): string[] {
  return [
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
    process.env.STRIPE_WEBHOOK_SECRET_BLUE_TICK?.trim(),
    process.env.STRIPE_WEBHOOK_SECRET_GOLD_TICK?.trim(),
  ].filter(Boolean) as string[];
}

export async function POST(req: Request) {
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
      /* try next secret */
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

      await prisma.stripeCheckoutReceipt.upsert({
        where: { sessionId: session.id },
        create: {
          sessionId: session.id,
          paymentIntent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          eventId: event.id,
          livemode: Boolean(event.livemode),
          amountTotal: session.amount_total ?? null,
          currency: session.currency ?? null,
          status: session.status ?? null,
          paymentStatus: session.payment_status ?? null,
          customerEmail: customerEmail?.toLowerCase() ?? null,
          metadata: session.metadata ?? {},
          raw: {
            id: event.id,
            type: event.type,
            created: event.created,
          },
        },
        update: {
          eventId: event.id,
          paymentStatus: session.payment_status ?? null,
          status: session.status ?? null,
        },
      });

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ---- EVERYTHING ELSE ----
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[stripe/webhook] handler error", err);
    return NextResponse.json(
      { ok: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
