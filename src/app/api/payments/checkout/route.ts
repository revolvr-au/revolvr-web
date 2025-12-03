import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

// No apiVersion argument = use account default, avoids TS mismatch
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
  amountCents?: number; // ignored for security – we decide on the server
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { mode, postId, userEmail } = body;

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    let name = "";
    let amountCents = 0;

    switch (mode) {
      // Single actions under a specific post
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

      // Bulk packs (no specific post – just credits)
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

    const successParams = new URLSearchParams();
    successParams.set("success", "1");
    successParams.set("mode", mode);
    if (postId) successParams.set("postId", postId);

    const cancelParams = new URLSearchParams();
    cancelParams.set("canceled", "1");
    cancelParams.set("mode", mode);
    if (postId) cancelParams.set("postId", postId);

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
      success_url: `${SITE_URL}/public-feed?${successParams.toString()}`,
      cancel_url: `${SITE_URL}/public-feed?${cancelParams.toString()}`,
      metadata: {
        mode,
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
