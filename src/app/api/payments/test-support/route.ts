// src/app/api/payments/test-support/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeSecretKey);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    mode?: "reaction" | "vote";
    viewerEmail?: string;
  };

  const mode = body.mode ?? "reaction";
  const viewerEmail = (body.viewerEmail ?? "").trim().toLowerCase();

  const creatorEmail =
    (process.env.DEFAULT_CREATOR_EMAIL ?? "").trim().toLowerCase();
  if (!creatorEmail) {
    return NextResponse.json(
      { error: "Missing DEFAULT_CREATOR_EMAIL" },
      { status: 500 }
    );
  }

  const amountCents = 50;
  const name = mode === "vote" ? "Pay to vote" : "Paid reaction";

  const successUrl = new URL(SITE_URL);
  successUrl.pathname = "/public-feed";
  successUrl.search = new URLSearchParams({
    success: "1",
    mode,
  }).toString();

  const cancelUrl = new URL(SITE_URL);
  cancelUrl.pathname = "/public-feed";
  cancelUrl.search = new URLSearchParams({
    canceled: "1",
    mode,
  }).toString();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: viewerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: amountCents,
          product_data: { name },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl.toString(),
    cancel_url: cancelUrl.toString(),
    metadata: {
      creator_id: creatorEmail,
      payment_type: mode,
      session_id: "TEST_TARGET",
      source: "LIVE",
      viewerEmail: viewerEmail || "",
    },
  });

  return NextResponse.json({ url: session.url }, { status: 200 });
}
