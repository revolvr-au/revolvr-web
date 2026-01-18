import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

type Body = {
  tier: "blue" | "gold";
  creatorProfileId?: string | null;
  creatorEmail?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;
    const tier: "blue" | "gold" = body.tier === "gold" ? "gold" : "blue";

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
    let creator: null | { id: string; email: string | null; verificationStatus: string | null } = null;

    if (body.creatorProfileId) {
      creator = await prisma.creatorProfile.findUnique({
        where: { id: String(body.creatorProfileId) },
        select: { id: true, email: true, verificationStatus: true },
      });
    } else if (body.creatorEmail) {
      const email = String(body.creatorEmail || "").trim().toLowerCase();
      creator = await prisma.creatorProfile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, verificationStatus: true },
      });

      // If creator doesn't exist yet, create it (only when an email is provided)
      if (!creator) {
        const created = await prisma.creatorProfile.create({
          data: {
            email,
            status: "ACTIVE",
          },
          select: { id: true, email: true, verificationStatus: true },
        });
        creator = created;
      }
    }

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found (provide creatorProfileId or creatorEmail)" },
        { status: 404 }
      );
    }

    // Prevent Gold -> Blue downgrade
    const current = String(creator.verificationStatus || "").toLowerCase();
    if (current === "gold" && tier === "blue") {
      return NextResponse.json(
        { error: "Gold users cannot downgrade to Blue." },
        { status: 400 }
      );
    }

    const successUrl = new URL(`/creator?verified=success&tier=${tier}`, SITE_URL);
    const cancelUrl = new URL("/creator?verified=cancel", SITE_URL);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
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
    const detail =
      err?.raw?.message ??
      err?.message ??
      (typeof err === "string" ? err : JSON.stringify(err));

    console.error("[payments/verification/checkout]", detail, {
      type: err?.type,
      code: err?.code,
    });

    return NextResponse.json(
      {
        error: "Stripe verification checkout failed",
        detail,
        type: err?.type ?? null,
        code: err?.code ?? null,
      },
      { status: 500 }
    );
  }
}
