import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthedEmailOrNull } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-01-27.acacia" });

export async function POST(req: Request) {
  try {
    const email = await getAuthedEmailOrNull();
    if (!email) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { cents, sparks } = await req.json();
    if (!cents || !sparks) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "aud",
          unit_amount: cents,
          product_data: {
            name: `${sparks} Sparks`,
            description: `${sparks} Sparks for REVOLVR — gift creators, fuel battles`,
          },
        },
        quantity: 1,
      }],
      metadata: { email, sparks: String(sparks) },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sparks/success?sparks=${sparks}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sparks/buy`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[sparks/checkout]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}