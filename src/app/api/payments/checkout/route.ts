// src/app/api/payments/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://revolvr-web.vercel.app";

type CheckoutMode =
  | "tip"
  | "boost"
  | "spin"
  | "tip-pack"
  | "boost-pack"
  | "spin-pack"
  | "reaction"
  | "vote";

type SupportSource = "FEED" | "LIVE";

type Body = {
  mode: CheckoutMode;
  creatorEmail: string; // required for attribution
  userEmail?: string | null;
  postId?: string | null; // legacy
  source?: SupportSource | string | null;
  targetId?: string | null;
  returnPath?: string | null;
};

function toKind(mode: string) {
  const m = String(mode || "").trim().toUpperCase();
  if (m.endsWith("-PACK")) return m.replace("-PACK", "_PACK");
  if (m === "TIP" || m === "BOOST" || m === "SPIN" || m === "REACTION" || m === "VOTE") return m;
  if (m === "TIP-PACK" || m === "BOOST-PACK" || m === "SPIN-PACK") return m.replace("-PACK", "_PACK");
  return m.replace(/[^A-Z0-9_]/g, "_");
}

function toSource(src: any): "FEED" | "LIVE" {
  const s = String(src || "FEED").toUpperCase();
  return s === "LIVE" ? "LIVE" : "FEED";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const mode = body?.mode;
    const creatorEmail = (body?.creatorEmail || "").trim().toLowerCase();
    const userEmail = (body?.userEmail ?? null)?.toString().trim().toLowerCase() || null;
    const postId = body?.postId ?? null;

    const source = toSource(body?.source);
    const targetId = (body?.targetId ?? postId ?? null) as string | null;

    if (!mode) return NextResponse.json({ error: "Missing mode" }, { status: 400 });
    if (!creatorEmail) return NextResponse.json({ error: "Missing creatorEmail" }, { status: 400 });

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
        name = "Revolvr spinner spin";
        amountCents = 100;
        break;

      case "tip-pack":
        name = "Tip pack (10× A$2 tips)";
        amountCents = 2000;
        break;
      case "boost-pack":
        name = "Boost pack (10× A$5 boosts)";
        amountCents = 5000;
        break;
      case "spin-pack":
        name = "Spin pack (20× A$1 spins)";
        amountCents = 2000;
        break;

      case "reaction":
        name = "Reaction";
        amountCents = 100;
        break;
      case "vote":
        name = "Vote";
        amountCents = 100;
        break;

      default:
        return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
    }

    const safeReturnPath =
      body?.returnPath && body.returnPath.startsWith("/") ? body.returnPath : "/public-feed";

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

    const kind = toKind(mode);

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
        creator_id: creatorEmail,
        payment_type: kind,
        source,
        target_id: targetId ?? "",
        viewer_email: userEmail ?? "",

        // legacy
        creatorEmail,
        userEmail: userEmail ?? "",
        postId: postId ?? "",
        mode,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[payments/checkout] error", err);
    return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
  }
}
