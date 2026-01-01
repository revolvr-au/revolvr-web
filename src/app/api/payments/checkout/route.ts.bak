// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

// Node runtime, use account default API version
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

type SupportSource = "FEED" | "LIVE";

type Body = {
  mode: CheckoutMode;

  // REQUIRED for ledger attribution
  creatorEmail: string;

  // viewer/user email
  userEmail?: string | null;

  // For FEED: postId, For LIVE: sessionId (or whatever you use)
  targetId?: string | null;

  // Optional but recommended
  source?: SupportSource;

  // Redirect
  returnPath?: string | null;
};

function toKind(mode: CheckoutMode) {
  // packs are not support actions
  if (mode.endsWith("-pack")) return null;

  switch (mode) {
    case "tip":
      return "TIP";
    case "boost":
      return "BOOST";
    case "spin":
      return "SPIN";
    case "reaction":
      return "REACTION";
    case "vote":
      return "VOTE";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const mode = body.mode;
    const creatorEmail = (body.creatorEmail ?? "").trim().toLowerCase();
    const userEmail = (body.userEmail ?? "").trim().toLowerCase() || null;

    const source: SupportSource = body.source ?? "FEED";
    const targetId = (body.targetId ?? "").trim() || null;

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }
    if (!creatorEmail) {
      return NextResponse.json({ error: "Missing creatorEmail" }, { status: 400 });
    }

    let name = "";
    let amountCents = 0;

    switch (mode) {
      // Single actions
      case "tip":
        name = "Creator tip";
        amountCents = 200; // A$2
        break;
      case "boost":
        name = "Post boost";
        amountCents = 500; // A$5
        break;
      case "spin":
        name = "Revolvr spinner spin";
        amountCents = 100; // A$1
        break;

      // NEW: micro-actions
      case "reaction":
        name = "Paid reaction";
        amountCents = 50; // A$0.50
        break;
      case "vote":
        name = "Pay to vote";
        amountCents = 50; // A$0.50
        break;

      // Packs
      case "tip-pack":
        name = "Tip pack (10× A$2 tips)";
        amountCents = 2000; // A$20
        break;
      case "boost-pack":
        name = "Boost pack (10× A$5 boosts)";
        amountCents = 5000; // A$50
        break;
      case "spin-pack":
        name = "Spin pack (20× A$1 spins)";
        amountCents = 2000; // A$20
        break;

      default:
        return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const safeReturnPath =
      body.returnPath && body.returnPath.startsWith("/") ? body.returnPath : "/public-feed";

    const successParams = new URLSearchParams();
    successParams.set("success", "1");
    successParams.set("mode", mode);
    if (targetId) successParams.set("targetId", targetId);

    const cancelParams = new URLSearchParams();
    cancelParams.set("canceled", "1");
    cancelParams.set("mode", mode);
    if (targetId) cancelParams.set("targetId", targetId);

    const successUrl = new URL(SITE_URL);
    successUrl.pathname = safeReturnPath;
    successUrl.search = successParams.toString();

    const cancelUrl = new URL(SITE_URL);
    cancelUrl.pathname = safeReturnPath;
    cancelUrl.search = cancelParams.toString();

    const kind = toKind(mode); // TIP/BOOST/SPIN/REACTION/VOTE or null for packs
    const bundleType = mode.endsWith("-pack") ? "pack" : "single";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: userEmail ?? undefined,
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
        // Canonical keys for ledger
        creator_id: creatorEmail,
        payment_type: kind ?? mode.toUpperCase(), // packs keep their mode, singles become enum-like
        source,
        target_id: targetId ?? "",

        // Viewer attribution
        viewer_email: userEmail ?? "",

        // Compatibility keys (safe)
        creatorEmail,
        userEmail: userEmail ?? "",
        mode,
        bundleType,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
