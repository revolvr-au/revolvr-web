// src/pages/api/live/support/checkout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    "[live-support checkout] STRIPE_SECRET_KEY is missing – live tips will fail!"
  );
}

const stripe = new Stripe(stripeSecretKey ?? "", {
  // Cast as any to avoid TS complaining about the exact version string
  apiVersion: "2024-06-20" as any,
});

type Body = {
  mode?: "tip" | "boost" | "spin";
  userEmail?: string;
  amountCents?: number;
  // we’re using postId to carry the live session id from the viewer
  postId?: string;
  kind?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  if (!stripeSecretKey) {
    return res
      .status(500)
      .json({ error: "Stripe is not configured for live support" });
  }

  try {
    const { mode, userEmail, amountCents, postId, kind }: Body =
      (req.body as Body) ?? {};

    // Basic validation
    if (!mode || !amountCents || !postId) {
      console.error("[live-support checkout] missing fields", {
        mode,
        amountCents,
        postId,
      });
      return res.status(400).json({
        error: "Missing mode, amountCents or postId (session id)",
      });
    }

    const amount = Number(amountCents);
    if (!Number.isInteger(amount) || amount <= 0) {
      console.error("[live-support checkout] invalid amountCents", {
        amountCents,
      });
      return res.status(400).json({ error: "Invalid amountCents" });
    }

    const originHeader = req.headers.origin as string | undefined;
    const origin =
      originHeader || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const liveSessionId = postId; // we treat postId as the live session id

    const label =
      mode === "tip"
        ? "Revolvr live tip"
        : mode === "boost"
        ? "Revolvr live boost"
        : "Revolvr live spin";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            product_data: {
              name: label,
            },
            unit_amount: amount, // in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/live/${encodeURIComponent(
        liveSessionId
      )}?success=1`,
      cancel_url: `${origin}/live/${encodeURIComponent(
        liveSessionId
      )}?canceled=1`,
      metadata: {
        paymentKind: kind ?? "live_support",
        mode,
        userEmail: userEmail ?? "",
        sessionId: liveSessionId,
        postId: liveSessionId, // keep postId for backwards compat
        amountCents: String(amount),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error(
      "[live-support checkout] error creating session:",
      err?.type,
      err?.message
    );
    return res.status(500).json({
      error: "Unable to create live support checkout",
      detail: err?.message ?? "unknown error",
    });
  }
}
