import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};

    const mode = metadata.mode;
    const userEmail = metadata.userEmail;
    const postId = metadata.postId;
    const amountCents = session.amount_total ?? 0;

    const supabase = getSupabaseAdmin();

    // 1) BOOST: write to boosts table
    if (mode === "boost" && userEmail && postId) {
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

    // 2) SPIN: write to spinner_spins table
    if (mode === "spin" && userEmail) {
      const { error } = await supabase.from("spinner_spins").insert({
        user_email: userEmail,
        post_id: postId ?? null,
        status: "paid",
        checkout_session_id: session.id,
        amount_cents: amountCents,
      });

      if (error) {
        console.error("Failed to insert spinner spin row:", error);
      } else {
        console.log("Spin recorded for", userEmail, "session", session.id);
      }
    }

    // TIP mode: we don't need to persist anything right now
  }

  // Always respond 2xx so Stripe is happy
  return new Response("ok", { status: 200 });
}
