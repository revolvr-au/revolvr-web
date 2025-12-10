import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use Stripe account default API version
const stripe = new Stripe(stripeSecretKey);

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const mode = session.metadata?.mode;
    const email =
      session.customer_email ??
      session.customer_details?.email ??
      null;

    if (!email || !mode) {
      console.warn("[stripe/webhook] Missing email or mode");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let boosts = 0;
    let tips = 0;
    let spins = 0;

    switch (mode) {
      case "boost-pack":
        boosts = 10;
        break;
      case "tip-pack":
        tips = 10;
        break;
      case "spin-pack":
        spins = 20;
        break;
      default:
        console.log("[stripe/webhook] Single purchase — no credit pack");
        break;
    }

    if (boosts || tips || spins) {
      await prisma.userCredits.upsert({
        where: { email },
        update: {
          boosts: { increment: boosts },
          tips: { increment: tips },
          spins: { increment: spins },
        },
        create: {
          email,
          boosts,
          tips,
          spins,
        },
      });

      console.log("✅ Credits awarded:", { email, boosts, tips, spins });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
