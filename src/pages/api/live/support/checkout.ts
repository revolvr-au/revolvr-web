// src/pages/api/live/support/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!stripeSecretKey) {
  console.warn("[live-support checkout] STRIPE_SECRET_KEY is missing");
}

if (!siteUrl) {
  console.warn("[live-support checkout] NEXT_PUBLIC_SITE_URL is missing");
}

const stripe = new Stripe(stripeSecretKey ?? "", {
  // Match the style you already use in the webhook file
  apiVersion: "2024-06-20" as any,
});

type Body = {
  sessionId?: string;
  mode?: "tip" | "boost" | "spin";
  amountCents?: number;
  userEmail?: string | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!stripeSecretKey || !siteUrl) {
    return res
      .status(500)
      .json({ error: "Stripe or site URL is not configured" });
  }

  try {
    const { sessionId, mode, amountCents, userEmail } = req.body as Body;

    if (!sessionId || !mode || !amountCents) {
      return res
        .status(400)
        .json({ error: "Missing sessionId, mode or amountCents" });
    }

    const cleanAmount = Math.max(100, Math.floor(amountCents)); // safety

    const label =
      mode === "tip"
        ? "Revolvr live tip"
        : mode === "boost"
        ? "Revolvr live boost"
        : "Revolvr live spin";

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: cleanAmount,
            product_data: {
              name: label,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/live/${encodeURIComponent(
        sessionId
      )}?success=1`,
      cancel_url: `${siteUrl}/live/${encodeURIComponent(
        sessionId
      )}?canceled=1`,
      metadata: {
        // 👇 THIS is what the webhook will look at
        paymentKind:
          mode === "tip"
            ? "live_tip"
            : mode === "boost"
            ? "live_boost"
            : "live_spin",
        liveSessionId: sessionId,
        userEmail: userEmail ?? "",
        amountCents: String(cleanAmount),
      },
    });

    return res.status(200).json({ url: checkout.url });
  } catch (err: any) {
    console.error("[live-support checkout] error creating session:", err);
    return res
      .status(500)
      .json({ error: "Unable to create live support checkout" });
  }
}
