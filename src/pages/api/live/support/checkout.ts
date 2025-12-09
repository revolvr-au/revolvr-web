// src/pages/api/live/support/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("[live/support/checkout] Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey ?? "", {
  // Match webhook style, avoid TS literal union drama
  apiVersion: "2024-06-20" as any,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      sessionId,
      mode,
      amountCents,
      userId,
      userEmail,
    }: {
      sessionId?: string;
      mode?: "tip" | "boost" | "spin" | string;
      amountCents?: number;
      userId?: string;
      userEmail?: string;
    } = req.body ?? {};

    if (!sessionId || !mode || !amountCents) {
      console.error("[live/support/checkout] Missing fields:", {
        sessionId,
        mode,
        amountCents,
      });
      return res.status(400).json({
        error: "sessionId, mode and amountCents are required",
      });
    }

    const origin =
      (req.headers.origin as string | undefined) ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";

    const successUrl = `${origin}/live/${encodeURIComponent(
      sessionId
    )}?success=1`;
    const cancelUrl = `${origin}/live/${encodeURIComponent(
      sessionId
    )}?canceled=1`;

    const prettyName =
      mode === "tip"
        ? "Live Tip"
        : mode === "boost"
        ? "Live Boost"
        : mode === "spin"
        ? "Live Spin"
        : "Live Support";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: {
              name: prettyName,
              description: `Support for live session ${sessionId}`,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        // 🔑 these are what the webhook will use:
        paymentKind: mode,
        mode,
        sessionId,
        amountCents: String(amountCents),
        userId: userId ?? "",
        userEmail: userEmail ?? "",
      },
    });

    if (!session.url) {
      console.error(
        "[live/support/checkout] Stripe session did not return a URL",
        session.id
      );
      return res.status(500).json({ error: "No checkout URL from Stripe" });
    }

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("[live/support/checkout] Error creating session:", err);
    return res.status(500).json({
      error: err?.message ?? "Failed to create checkout session",
    });
  }
}
