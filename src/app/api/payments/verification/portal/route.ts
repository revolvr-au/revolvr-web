import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      console.warn("Missing STRIPE_SECRET_KEY");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeKey);

    // 👉 keep minimal for now (we just want build passing)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verification/portal]", err);
    return NextResponse.json(
      { error: "Portal failed" },
      { status: 500 }
    );
  }
}