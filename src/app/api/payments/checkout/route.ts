import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    // we *could* read mode/amount from the body later,
    // but for now it's a fixed $2 tip checkout
    const { mode, userEmail } = await req.json().catch(() => ({}));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          // ✅ your fixed $2 AUD price
          price: "price_1SYJWiFQChfgRshNcs23XgcL",
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=cancel`,
      metadata: {
        purpose: mode ?? "tip",
        userEmail: userEmail ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    return NextResponse.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}
