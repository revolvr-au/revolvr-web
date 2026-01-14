import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

type Body = {
  tier: "blue" | "gold";
  // map entitlement to CreatorProfile
  creatorProfileId?: string | null;
  // fallback mapping if you prefer
  creatorEmail?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    const tier = body.tier === "gold" ? "gold" : "blue";

    const priceId =
      tier === "gold"
        ? process.env.STRIPE_GOLD_TICK_PRICE_ID
        : process.env.STRIPE_BLUE_TICK_PRICE_ID;

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing STRIPE_${tier.toUpperCase()}_TICK_PRICE_ID` },
        { status: 500 }
      );
    }

    // Resolve creator profile (prefer ID; fallback to email)
    let creator = null as null | { id: string; email: string | null };

    if (body.creatorProfileId) {
      creator = await prisma.creatorProfile.findUnique({
        where: { id: String(body.creatorProfileId) },
        select: { id: true, email: true },
      });
    } else if (body.creatorEmail) {
      creator = await prisma.creatorProfile.findFirst({
        where: { email: { equals: String(body.creatorEmail).trim(), mode: "insensitive" } },
        select: { id: true, email: true },
      });
    }

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found (provide creatorProfileId or creatorEmail)" },
        { status: 404 }
      );
    }

    const successUrl = new URL("/creator?verified=1", SITE_URL);
    const cancelUrl = new URL("/creator?canceled=1", SITE_URL);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),

      // Optional; helps Stripe receipt UX
      customer_email: creator.email ?? undefined,

      metadata: {
        purpose: "verification",
        tier,
        userId: creator.id, // webhook expects this
        priceId,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("[payments/verification/checkout]", err?.message ?? err);
    return NextResponse.json({ error: "Stripe verification checkout failed" }, { status: 500 });
  }
}
