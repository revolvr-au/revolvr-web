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
  | "tip-pack"
  | "boost-pack"
  | "spin-pack";

type SupportSource = "FEED" | "LIVE";

type Body = {
  mode: CheckoutMode;

  // Creator paid out (ledger attribution). If omitted, we fallback to userEmail.
  creatorEmail?: string | null;

  // Viewer/payer
  userEmail?: string | null;

  // Support context
  source?: SupportSource | string | null;
  targetId?: string | null; // postId / sessionId / etc

  // Legacy fields (still accepted)
  postId?: string | null;

  returnPath?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const mode = body.mode;
    const userEmail = (body.userEmail ?? "").toString().trim().toLowerCase() || null;

    // IMPORTANT:
    // If client forgot creatorEmail (your current bug), fallback to userEmail so checkout still works.
    const creatorEmail =
      (body.creatorEmail ?? userEmail ?? "")
        .toString()
        .trim()
        .toLowerCase() || null;

    const sourceRaw = (body.source ?? "FEED").toString().trim().toUpperCase();
    const source: SupportSource = sourceRaw === "LIVE" ? "LIVE" : "FEED";

    const targetId =
      (body.targetId ?? body.postId ?? "").toString().trim() || null;

    if (!mode) {
      return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    }

    // If you truly want to require creatorEmail always, remove the fallback above.
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
      body.returnPath && body.returnPath.startsWith("/")
        ? body.returnPath
        : "/public-feed";

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
        // NEW keys (webhook reads these)
        creator_id: creatorEmail,
        payment_type: mode, // webhook normalises to TIP/BOOST/SPIN etc
        viewer_email: userEmail ?? "",
        source, // FEED|LIVE
        target_id: targetId ?? "",

        // Legacy keys (safe to keep)
        creatorEmail: creatorEmail,
        userEmail: userEmail ?? "",
        postId: targetId ?? "",
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
