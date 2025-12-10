// src/pages/api/live/support/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error(
    "[live-support checkout] STRIPE_SECRET_KEY is missing in environment"
  );
}

// Use the same version your Stripe SDK expects
const stripe = new Stripe(stripeSecretKey ?? "", {
  apiVersion: "2025-11-17.clover" as any,
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

  try {
    if (!stripeSecretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY env var");
    }

    const { sessionId, mode, amountCents, userEmail } =
      (req.body ?? {}) as Body;

    if (!sessionId || !mode || !amountCents) {
      console.error("[live-support checkout] bad payload", {
        sessionId,
        mode,
        amountCents,
      });
      return res
        .status(400)
        .json({ error: "Missing sessionId, mode or amountCents" });
    }

    const origin =
      req.headers.origin ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    console.log("[live-support checkout] creating session", {
      sessionId,
      mode,
      amountCents,
      userEmail,
      origin,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            product_data: {
              name: `Live ${mode} for session ${sessionId}`,
            },
            unit_amount: amountCents,
          },
        },
      ],
      success_url: `${origin}/live/${encodeURIComponent(
        sessionId
      )}?success=1`,
      cancel_url: `${origin}/live/${encodeURIComponent(sessionId)}`,
      metadata: {
        kind: "live",
        mode,
        userEmail: userEmail ?? "",
        sessionId,
        amountCents: String(amountCents),
      },
    });

    console.log(
      "[live-support checkout] session created",
      session.id,
      "url:",
      session.url
    );

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error(
      "[live-support checkout] error creating session:",
      err?.message || err
    );
    return res
      .status(500)
      .json({ error: "Unable to create live support checkout" });
  }
}
