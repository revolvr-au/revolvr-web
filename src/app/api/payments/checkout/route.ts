// app/api/payments/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

// Use your deployed URL here if you change domains
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutBody = {
  mode: "tip" | "boost" | "spin";
  userEmail?: string | null;
  amountCents?: number;
  postId?: string | null;
  /**
   * Optional path the user should be sent back to after payment.
   * Example: "/public-feed" or "/dashboard"
   */
  successPath?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CheckoutBody;

    const { mode, userEmail, amountCents, postId, successPath } = body;

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    // Where to send the user after Stripe finishes
    const origin = DEFAULT_SITE_URL;
    const safePath =
      typeof successPath === "string" && successPath.startsWith("/")
        ? successPath
        : "/dashboard";

    const success_url = `${origin}${safePath}?payment=success&mode=${encodeURIComponent(
      mode
    )}`;
    const cancel_url = `${origin}${safePath}?payment=cancelled&mode=${encodeURIComponent(
      mode
    )}`;

    // If caller doesn’t pass an amount, fall back to your standard prices
    const unitAmount =
      amountCents ??
      (mode === "tip" ? 200 : mode === "boost" ? 500 : 100); // AUD cents

    const productName =
      mode === "tip"
        ? "Creator tip"
        : mode === "boost"
        ? "Post boost"
        : "Spinner spin";

    const productDescription =
      mode === "tip"
        ? "Revolvr creator tip"
        : mode === "boost"
        ? "Revolvr post boost"
        : "Revolvr spinner spin";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail ?? undefined,
      success_url,
      cancel_url,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: unitAmount,
            product_data: {
              name: productName,
              description: productDescription,
            },
          },
        },
      ],
      metadata: {
        mode,
        userEmail: userEmail ?? "",
        postId: postId ?? "",
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[/api/payments/checkout] error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
