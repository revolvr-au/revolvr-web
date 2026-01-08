// src/app/api/payments/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!secret || !key) {
    return NextResponse.json({ ok: false, error: "Missing Stripe env" }, { status: 500 });
  }

  const stripe = new Stripe(key);

  // IMPORTANT: raw body required for Stripe signature verification
  const body = await req.text();

  try {
    stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    console.error("[payments/webhook] signature verify failed", errorMessage(err));
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  // If this endpoint is legacy, we just ACK so Stripe stops retrying.
  return NextResponse.json({ ok: true }, { status: 200 });
}
