// src/pages/api/payments/checkout.ts
console.log("[CANARY] /api/live/support/checkout hit", {
  method: req.method,
  url: req.url,
  host: req.headers.host,
  origin: req.headers.origin,
  referer: req.headers.referer,
  ua: req.headers["user-agent"],
  xfh: req.headers["x-forwarded-host"],
  xfp: req.headers["x-forwarded-proto"],
  xff: req.headers["x-forwarded-for"],
});

import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("[checkout] Missing STRIPE_SECRET_KEY env var");
}

const stripe = new Stripe(stripeSecretKey ?? "", {
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
      mode,        // "tip" | "boost" | "spin"
      userEmail,
      amountCents, // number (we'll trust this for packs)
      postId,      // post id OR live session id
      kind,        // "post" | "live" | undefined
      bundleType,  // "single" | "pack" | undefined
    } = req.body as {
      mode?: string;
      userEmail?: string;
      amountCents?: number;
      postId?: string;
      kind?: string;
      bundleType?: string;
    };

    if (!mode || !userEmail) {
      return res
        .status(400)
        .json({ error: "Missing mode or userEmail in body" });
    }

    const cents = Number(amountCents);
    if (!Number.isFinite(cents) || cents <= 0) {
      return res.status(400).json({
        error: "Invalid amountCents – must be a positive number",
      });
    }

    const origin =
      (req.headers.origin as string | undefined) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";

    // Decide copy based on kind + bundleType
    const modeLabel =
      mode === "tip" ? "tip" : mode === "boost" ? "boost" : "spin";

    const isLive = kind === "live";
    const isPack = bundleType === "pack";

    const productName = isLive
      ? `Revolvr live ${modeLabel}${isPack ? " pack" : ""}`
      : `Post ${modeLabel}${isPack ? " pack" : ""}`;

    const successUrl = isLive && postId
      ? `${origin}/live/${encodeURIComponent(postId)}?success=1`
      : `${origin}/public-feed?success=1`;

    const cancelUrl = isLive && postId
      ? `${origin}/live/${encodeURIComponent(postId)}`
      : `${origin}/public-feed`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: cents,
            product_data: {
              name: productName,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userEmail,
        postId: postId ?? "",
        paymentKind: kind ?? "post", // webhook looks at this
        mode,
        bundleType: bundleType ?? "single",
        rawAmountCents: String(cents),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] Error creating Stripe session:", err);
    return res
      .status(500)
      .json({ error: "Unable to create checkout session" });
  }
}
