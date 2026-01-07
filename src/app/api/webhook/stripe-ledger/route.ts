import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonError("Missing stripe-signature header", 400);

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;

  if (!secret || !key) return jsonError("Missing Stripe env", 500);

  const stripe = new Stripe(key);

  // raw body required for Stripe signature verification
  const body = await req.text();

  try {
    stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    console.error("[webhook/stripe-ledger] signature verify failed", errorMessage(err));
    return jsonError("Invalid signature", 400);
  }

  // Legacy endpoint: acknowledge so Stripe doesn't retry.
  return NextResponse.json({ ok: true }, { status: 200 });
}
