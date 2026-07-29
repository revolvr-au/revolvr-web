import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";
import { getSparkTier, SPARK_TIER_IDS } from "@/lib/sparkTiers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.revolvr.net").replace(/\/$/, "");

export async function POST(req: Request) {
  try {
    const authedEmail = await getAuthedEmailOrNull();
    if (!authedEmail) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const email = authedEmail.trim().toLowerCase();

    // Only the tier id is client-supplied. Price and spark count come from the
    // server table, so {cents: 299, sparks: 999999} in the body buys nothing —
    // any other key in the body is ignored on purpose.
    const body = (await req.json().catch(() => null)) as { tier?: unknown } | null;
    const tier = getSparkTier(body?.tier);
    if (!tier) {
      return NextResponse.json(
        { error: `Unknown tier. Expected one of: ${SPARK_TIER_IDS}` },
        { status: 400 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "aud",
          unit_amount: tier.cents,
          product_data: {
            name: `${tier.sparks} Sparks`,
            description: `${tier.sparks} Sparks for REVOLVR — gift creators, fuel battles`,
          },
        },
        quantity: 1,
      }],
      // `purpose` routes this session to the sparks branch of /api/ring/webhook;
      // `tierId` is what the webhook re-resolves the credit amount from.
      metadata: {
        purpose: "sparks",
        email,
        tierId: tier.id,
        sparks: String(tier.sparks),
      },
      success_url: `${SITE_URL}/spark/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/spark/buy`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[spark/checkout]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}