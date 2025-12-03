// src/app/api/payments/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// --- Environment variables ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Missing Stripe environment variables");
}
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

// --- Stripe client ---
// NOTE: no apiVersion passed -> uses account default, avoids TS literal mismatch
const stripe = new Stripe(stripeSecretKey);

// --- Supabase admin client (server-only) ---
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- Webhook handler ---
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret as string // we validated it's set above
    );
  } catch (err: any) {
    console.error("[stripe webhook] invalid signature", err?.message ?? err);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  // Handle completed checkout session
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const mode = session.metadata?.mode;
    const email =
      session.customer_email ?? session.metadata?.userEmail ?? undefined;

    if (!mode || !email) {
      console.warn("[stripe webhook] missing mode or email", session.id);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Only pack purchases adjust balances
    const isPack =
      mode === "tip-pack" ||
      mode === "boost-pack" ||
      mode === "spin-pack";

    if (isPack) {
      const tipPackSize = parseInt(session.metadata?.tipPackSize ?? "0", 10);
      const boostPackSize = parseInt(session.metadata?.boostPackSize ?? "0", 10);
      const spinPackSize = parseInt(session.metadata?.spinPackSize ?? "0", 10);

      try {
        const { data: existing, error: selectError } = await supabaseAdmin
          .from("user_balances")
          .select("*")
          .eq("user_email", email)
          .maybeSingle();

        if (selectError) throw selectError;

        const currentTips = existing?.tip_credits ?? 0;
        const currentBoosts = existing?.boost_credits ?? 0;
        const currentSpins = existing?.spin_credits ?? 0;

        const deltaTips = mode === "tip-pack" ? tipPackSize : 0;
        const deltaBoosts = mode === "boost-pack" ? boostPackSize : 0;
        const deltaSpins = mode === "spin-pack" ? spinPackSize : 0;

        const { error: upsertError } = await supabaseAdmin
          .from("user_balances")
          .upsert({
            user_email: email,
            tip_credits: currentTips + deltaTips,
            boost_credits: currentBoosts + deltaBoosts,
            spin_credits: currentSpins + deltaSpins,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) throw upsertError;

        console.log(
          `[stripe webhook] credited ${mode} to ${email}: (+${deltaTips} tips, +${deltaBoosts} boosts, +${deltaSpins} spins)`
        );
      } catch (err) {
        console.error("[stripe webhook] database error", err);
        // Still return 200 so Stripe does not retry forever
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
