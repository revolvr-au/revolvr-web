// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

// Node runtime, use account default API version
const stripe = new Stripe(stripeSecretKey);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack";

type Body = {
  mode: CheckoutMode;
  userEmail?: string | null;
  postId?: string | null;

  /**
   * Path the user should return to after checkout, e.g.
   *   "/public-feed"
   *   "/live/revolvr-123..."
   * Must start with "/" or it will be ignored.
   */
  returnTo?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { mode, postId, userEmail, returnTo } = body;

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    let name = "";
    let amountCents = 0;

    switch (mode) {
      // Single actions
      case "tip":
        name = "Creator tip";
        amountCents = 200; // A$2
        break;
      case "boost":
        name = "Post boost";
        amountCents = 500; // A$5
        break;
      case "spin":
        name = "Revolvr spinner spin";
        amountCents = 100; // A$1
        break;

      // Packs
      case "tip-pack":
        name = "Tip pack (10× A$2 tips)";
        amountCents = 2000; // A$20
        break;
      case "boost-pack":
        name = "Boost pack (10× A$5 boosts)";
        amountCents = 5000; // A$50
        break;
      case "spin-pack":
        name = "Spin pack (20× A$1 spins)";
        amountCents = 2000; // A$20
        break;

      default:
        return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    // Decide where to send the user back after checkout.
    // If returnTo is a safe absolute path, use it; otherwise default to /public-feed.
    const basePath =
      typeof returnTo === "string" && returnTo.startsWith("/")
        ? returnTo
        : "/public-feed";

    const successUrl = new URL(basePath, SITE_URL);
    successUrl.searchParams.set("success", "1");
    successUrl.searchParams.set("mode", mode);
    if (postId) successUrl.searchParams.set("postId", postId);

    const cancelUrl = new URL(basePath, SITE_URL);
    cancelUrl.searchParams.set("canceled", "1");
    cancelUrl.searchParams.set("mode", mode);
    if (postId) cancelUrl.searchParams.set("postId", postId);

    const bundleType = mode.endsWith("-pack") ? "pack" : "single";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail ?? undefined,
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
        mode,
        bundleType,
        postId: postId ?? "",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
