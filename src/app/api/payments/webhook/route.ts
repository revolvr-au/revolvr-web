// src/app/api/payments/webhook/route.ts
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // we need Buffer for Stripe

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // If this ever throws in prod, env vars are missing
    throw new Error("Missing Supabase admin env vars");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("Missing Stripe signature or webhook secret");
    return new Response("Bad request", { status: 400 });
  }

  const body = await req.arrayBuffer();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(body),
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // We only care about finished checkouts
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const mode = session.metadata?.mode;
    const postId = session.metadata?.postId;
    const userEmail = session.metadata?.userEmail;

    // Only log boosts (ignore $2 tip etc)
    if (mode === "boost" && postId && userEmail) {
      const supabase = getSupabaseAdmin();

      const amountCents = session.amount_total ?? 0;

      const { error } = await supabase.from("boosts").insert({
        post_id: postId,
        user_email: userEmail,
        status: "paid",
        checkout_session_id: session.id,
        amount_cents: amountCents,
      });

      if (error) {
        console.error("Failed to insert boost row:", error);
      } else {
        console.log("Boost recorded for post", postId, "by", userEmail);
      }
    }
  }

  // Stripe expects a 2xx, even if we ignore some events
  return new Response("ok", { status: 200 });
}
