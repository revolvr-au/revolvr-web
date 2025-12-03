// src/app/api/payments/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY env var");
}

// Match the version that the Stripe SDK types expect
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-11-17.clover",
});

// Use your deployed URL here if you change domains
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutBody = {
  mode: "tip" | "boost" | "spin";
  userEmail: string | null;
  amountCents: number;
  postId?: string | null;
  // Optional override for where to send the user after success
  successPath?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutBody;

    const { mode, userEmail, amountCents, postId, successPath } = body;

    if (!mode || !amountCents) {
      return NextResponse.json(
        { error: "Missing required checkout parameters" },
        { status: 400 }
      );
    }

    const label =
      mode === "tip"
        ? "Revolvr creator tip"
        : mode === "boost"
        ? "Revolvr post boost"
        : "Revolvr spinner spin";

    const successUrlPath = successPath ?? "/dashboard";
    const successUrl = new URL(`${SITE_URL}${successUrlPath}`);
    successUrl.searchParams.set("payment", "success");
    successUrl.searchParams.set("mode", mode);

    const cancelUrl = new URL(`${SITE_URL}${successUrlPath}`);
    cancelUrl.searchParams.set("payment", "cancelled");
    cancelUrl.searchParams.set("mode", mode);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: label,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      metadata: {
        mode,
        postId: postId ?? "",
        origin: "revolvr-public-feed",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
