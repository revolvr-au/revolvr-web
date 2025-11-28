import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CheckoutMode = "tip" | "boost";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      mode,
      userEmail,
      amountCents,
      priceId,
      quantity = 1,
      postId,
    }: {
      mode: CheckoutMode;
      userEmail?: string;
      amountCents?: number;
      priceId?: string;
      quantity?: number;
      postId?: string;
    } = body;

    if (!mode) {
      return NextResponse.json(
        { error: "Missing mode (tip | boost)." },
        { status: 400 }
      );
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Missing userEmail." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (mode === "tip") {
      // TIP MODE – used by "Test $2 tip (Stripe)" button
      if (!amountCents && !priceId) {
        return NextResponse.json(
          { error: "For tips, provide amountCents or priceId." },
          { status: 400 }
        );
      }

      if (priceId) {
        lineItems.push({
          price: priceId,
          quantity,
        });
      } else {
        lineItems.push({
          price_data: {
            currency: "aud",
            product_data: {
              name: "Revolvr Tip",
              description: "Support your favourite creator on Revolvr.",
            },
            unit_amount: amountCents,
          },
          quantity,
        });
      }
    } else if (mode === "boost") {
      // BOOST MODE – boost a specific post
      if (!postId) {
        return NextResponse.json(
          { error: "Boost payments require a postId." },
          { status: 400 }
        );
      }

      const boostAmount = amountCents ?? 500; // default A$5.00

      lineItems.push({
        price_data: {
          currency: "aud",
          product_data: {
            name: "Revolvr Post Boost",
            description:
              "Boost your post for extra visibility on the Revolvr feed.",
          },
          unit_amount: boostAmount,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
      customer_email: userEmail,
      metadata: {
        mode,
        userEmail,
        postId: postId ?? "",
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 }
    );
  }
}
