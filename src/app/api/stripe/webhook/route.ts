import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";


const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Use Stripe account default API version
const stripe = new Stripe(stripeSecretKey);


type CreditDelta = { boosts: number; tips: number; spins: number };

function creditsForMode(mode: string): CreditDelta | null {
  switch (mode) {
    // Packs
    case "boost-pack":
      return { boosts: 10, tips: 0, spins: 0 };
    case "tip-pack":
      return { boosts: 0, tips: 10, spins: 0 };
    case "spin-pack":
      return { boosts: 0, tips: 0, spins: 20 };

    // Singles
    case "boost":
      return { boosts: 1, tips: 0, spins: 0 };
    case "tip":
      return { boosts: 0, tips: 1, spins: 0 };
    case "spin":
      return { boosts: 0, tips: 0, spins: 1 };

    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
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
    const email = session.customer_email ?? session.customer_details?.email ?? null;

    if (!email || !mode) {
      console.warn("[stripe/webhook] Missing email or mode", { email, mode });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const delta = creditsForMode(mode);

    if (!delta) {
      console.warn("[stripe/webhook] Unknown mode — no credits awarded:", mode);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    await prisma.userCredits.upsert({
      where: { email },
      update: {
        boosts: { increment: delta.boosts },
        tips: { increment: delta.tips },
        spins: { increment: delta.spins },
      },
      create: {
        email,
        boosts: delta.boosts,
        tips: delta.tips,
        spins: delta.spins,
      },
    });

    console.log("✅ Credits awarded:", { email, mode, ...delta });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
