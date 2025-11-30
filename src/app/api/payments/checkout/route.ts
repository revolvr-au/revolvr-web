import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Type hack – TS expects a literal:
  apiVersion: "2024-06-20" as any,
});

type CheckoutMode = "tip" | "boost" | "spin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: CheckoutMode = body.mode;
    const userEmail: string | undefined = body.userEmail;
    const amountCents: number | undefined = body.amountCents;
    const postId: string | undefined = body.postId;

    if (!mode || !["tip", "boost", "spin"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Expected 'tip', 'boost', or 'spin'." },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail" },
        { status: 400 }
      );
    }

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid amountCents" },
        { status: 400 }
      );
    }

    const baseDescription =
      mode === "tip"
        ? "Revolvr creator tip"
        : mode === "boost"
        ? "Revolvr post boost"
        : "Revolvr spinner spin";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name:
                mode === "tip"
                  ? "Creator tip"
                  : mode === "boost"
                  ? "Post boost"
                  : "Spinner spin",
              description: baseDescription,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      // You can customise these later
      success_url: `${
        process.env.NEXT_PUBLIC_SITE_URL ??
        "https://revolvr-web.vercel.app"
      }/dashboard?checkout=success`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_SITE_URL ??
        "https://revolvr-web.vercel.app"
      }/dashboard?checkout=cancelled`,
      metadata: {
        // Main flag the webhook will read:
        paymentKind: mode,
        // Backwards-compatible aliases:
        mode,
        type: mode,
        userEmail,
        postId: postId ?? "",
      },
    });

    if (!session.url) {
      console.error("Stripe did not return a checkout URL", session.id);
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error in /api/payments/checkout:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
