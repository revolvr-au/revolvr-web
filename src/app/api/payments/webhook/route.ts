// src/app/api/payments/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Stripe secrets not set");
}
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Supabase service role env vars not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-11-17.clover",
});


// Service-role client (server-only!)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");


  let event: Stripe.Event;

  try {
    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[stripe webhook] signature error", err?.message ?? err);
    return NextResponse.json(
      { error: `Webhook error: ${err?.message ?? "Invalid signature"}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const mode = session.metadata?.mode;
    const email =
      session.customer_email ?? session.metadata?.userEmail ?? undefined;

    if (!mode || !email) {
      console.warn(
        "[stripe webhook] session completed without mode/email",
        session.id
      );
      return NextResponse.json({ received: true });
    }

    // Only pack modes affect balances
    if (
      mode === "tip-pack" ||
      mode === "boost-pack" ||
      mode === "spin-pack"
    ) {
      const tipPackSize = parseInt(session.metadata?.tipPackSize ?? "0", 10);
      const boostPackSize = parseInt(
        session.metadata?.boostPackSize ?? "0",
        10
      );
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
          `[stripe webhook] credited ${mode} for ${email} (tips +${deltaTips}, boosts +${deltaBoosts}, spins +${deltaSpins})`
        );
      } catch (err) {
        console.error("[stripe webhook] Supabase error", err);
        // We still return 200 so Stripe doesn't retry forever;
        // but you can monitor logs and manually fix if needed.
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
