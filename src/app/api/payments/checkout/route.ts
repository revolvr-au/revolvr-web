// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "reaction"
  | "vote"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack";

type Body = {
  mode: CheckoutMode;
  creatorEmail?: string | null;
  userEmail?: string | null;
  targetId?: string | null;
  source?: "FEED" | "LIVE";
  returnPath?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const mode = body.mode;
    const userEmail = (body.userEmail ?? "").trim().toLowerCase();
    const creatorEmail = (body.creatorEmail ?? "").trim().toLowerCase();

    // 🔑 SAFE FALLBACK (this fixes your issue)
    const resolvedCreatorEmail = creatorEmail || userEmail;
    if (!resolvedCreatorEmail) {
      return NextResponse.json(
        { error: "Missing creatorEmail" },
        { status: 400 }
      );
    }

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    let name = "";
    let amountCents = 0;

    switch (mode) {
      case "tip":
        name = "Creator tip";
        amountCents = 200;
        break;
      case "boost":
        name = "Post boost";
        amountCents = 500;
        break;
      case "spin":
        name = "Revolvr spin";
        amountCents = 100;
        break;
      case "reaction":
        name = "Paid reaction";
        amountCents = 50;
        break;
      case "vote":
        name = "Pay to vote";
        amountCents = 50;
        break;
      case "tip-pack":
        name = "Tip pack";
        amountCents = 2000;
        break;
      case "boost-pack":
        name = "Boost pack";
        amountCents = 5000;
        break;
      case "spin-pack":
        name = "Spin pack";
        amountCents = 2000;
        break;
      default:
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const safeReturnPath =
      body.returnPath && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/creator/dashboard";

    const successUrl = new URL(SITE_URL);
    successUrl.pathname = safeReturnPath;
    successUrl.search = `success=1&mode=${mode}`;

    const cancelUrl = new URL(SITE_URL);
    cancelUrl.pathname = safeReturnPath;
    cancelUrl.search = `canceled=1&mode=${mode}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: amountCents,
            product_data: { name },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
      metadata: {
        creator_id: resolvedCreatorEmail,
        payment_type: mode.toUpperCase(),
        viewer_email: userEmail,
        source: body.source ?? "FEED",
        target_id: body.targetId ?? "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error", err);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
