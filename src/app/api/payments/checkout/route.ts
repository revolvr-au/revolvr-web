import { NextResponse } from "next/server";
import Stripe from "stripe";

// -----------------------------
// Stripe Setup
// -----------------------------
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

// No apiVersion argument = use Stripe account default (avoids TS version mismatch)
const stripe = new Stripe(stripeSecretKey);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

// -----------------------------
// Allowed checkout modes
// -----------------------------

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
};

// -----------------------------
// Server-controlled pricing table
// -----------------------------
const PRICE_TABLE: Record<
  CheckoutMode,
  { label: string; amountCents: number }
> = {
  // Single actions
  tip: { label: "Creator tip", amountCents: 200 }, // $2
  boost: { label: "Post boost", amountCents: 500 }, // $5
  spin: { label: "Revolvr spinner spin", amountCents: 100 }, // $1

  // Pack actions
  "tip-pack": { label: "Tip pack (10× tips)", amountCents: 2000 }, // $20
  "boost-pack": { label: "Boost pack (10× boosts)", amountCents: 5000 }, // $50
  "spin-pack": { label: "Spin pack (20× spins)", amountCents: 2000 }, // $20
};

// -----------------------------
// Main handler
// -----------------------------
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { mode, postId, userEmail } = body;

    // Validate mode
    if (!mode || !(mode in PRICE_TABLE)) {
      return NextResponse.json(
        { error: "Invalid or missing checkout mode" },
        { status: 400 }
      );
    }

    const { label, amountCents } = PRICE_TABLE[mode];

    // Build success + cancel URLs
    const successParams = new URLSearchParams({
      success: "1",
      mode,
    });
    if (postId) successParams.set("postId", postId);

    const cancelParams = new URLSearchParams({
      canceled: "1",
      mode,
    });
    if (postId) cancelParams.set("postId", postId);

    // -----------------------------
    // Create Stripe Checkout Session
    // -----------------------------
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail ?? undefined,
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: label,
              metadata: {
                type: mode.includes("pack") ? "pack" : "single",
              },
            },
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
    console.error("[payments/checkout] ERROR", err);
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
