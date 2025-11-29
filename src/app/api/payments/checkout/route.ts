import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

type CheckoutMode = "tip" | "boost" | "spin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: CheckoutMode | undefined = body.mode;
    const userEmail: string | undefined = body.userEmail;
    const amountCents: number | undefined = body.amountCents;
    const postId: string | undefined = body.postId; // used for boosts, optional for spins

    if (!mode || !userEmail || !amountCents) {
      return NextResponse.json(
        { error: "Missing mode, userEmail, or amountCents" },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const productName =
      mode === "tip"
        ? "Revolvr tip"
        : mode === "boost"
        ? "Revolvr feed boost"
        : "Revolvr spinner spin";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "AUD",
            product_data: {
              name: productName,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/dashboard?status=success`,
      cancel_url: `${siteUrl}/dashboard?status=cancelled`,
      metadata: {
        mode,
        userEmail,
        amountCents: String(amountCents),
        ...(postId ? { postId } : {}),
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
