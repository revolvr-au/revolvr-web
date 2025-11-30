import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin env vars are missing");
  }

  return createClient(url, serviceRoleKey);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe webhook signature verification failed", err);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // We only care about successful checkout sessions right now
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const supabase = getSupabaseAdmin();

      const metadata = session.metadata || {};
      const mode = (metadata.mode as "tip" | "boost" | "spin" | undefined) ?? null;
      const userEmail =
        metadata.userEmail ||
        session.customer_details?.email ||
        null;
      const postId = (metadata.postId as string | undefined) ?? null;
      const amountCents = session.amount_total ?? null;
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      // 1️⃣ Log the payment in our own ledger
      const { error: insertError } = await supabase.from("payments").insert({
        stripe_payment_intent_id: paymentIntentId,
        stripe_checkout_session_id: session.id,
        mode,
        amount_cents: amountCents,
        user_email: userEmail,
        post_id: postId,
        status: session.payment_status,
      });

      if (insertError) {
        console.error("❌ Error inserting payment row", insertError);
      } else {
        console.log(
          `✅ Logged payment: mode=${mode} email=${userEmail} amount=${amountCents}`
        );
      }

      // 2️⃣ If it's a boost, mark the post as boosted
      if (mode === "boost" && postId) {
        const boostDurationHours = 24;
        const boostExpiresAt = new Date();
        boostExpiresAt.setHours(
          boostExpiresAt.getHours() + boostDurationHours
        );

        const { error: boostError } = await supabase
          .from("posts")
          .update({
            is_boosted: true,
            boost_expires_at: boostExpiresAt.toISOString(),
          })
          .eq("id", postId);

        if (boostError) {
          console.error("❌ Error marking post as boosted", boostError);
        } else {
          console.log(`🚀 Post boosted via webhook: post_id=${postId}`);
        }
      }

      // 3️⃣ For spins + tips we just log for now.
      //    Later we can hook spins into credits, badges, etc.
    }
  }

  // Always return 200 so Stripe doesn't keep retrying
  return new NextResponse("OK", { status: 200 });
}
