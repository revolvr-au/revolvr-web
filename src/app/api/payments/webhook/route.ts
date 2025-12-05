import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// --- Env ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}
if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}
if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase service env vars");
}

// --- Clients ---
// No apiVersion -> use account default (avoids TS literal mismatch)
const stripe = new Stripe(stripeSecretKey);

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- Webhook handler ---
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret as string
    );
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const mode = session.metadata?.mode as
      | "tip"
      | "boost"
      | "spin"
      | undefined;
    const postId = session.metadata?.postId;
    const buyerEmail = session.metadata?.userEmail;

    if (!mode || !postId) {
      console.warn("Webhook missing mode or postId in metadata");
      return NextResponse.json({ received: true });
    }

    try {
      // Read current counts
      const { data: post, error: fetchError } = await supabaseAdmin
        .from("posts")
        .select("tip_count, boost_count, spin_count")
        .eq("id", postId)
        .single();

      if (fetchError || !post) {
        console.error("Error loading post in webhook", fetchError);
        return NextResponse.json({ received: true });
      }

      const tipCount = post.tip_count ?? 0;
      const boostCount = post.boost_count ?? 0;
      const spinCount = post.spin_count ?? 0;

      const updates: Record<string, number> = {
        tip_count: tipCount,
        boost_count: boostCount,
        spin_count: spinCount,
      };

      if (mode === "tip") updates.tip_count = tipCount + 1;
      if (mode === "boost") updates.boost_count = boostCount + 1;
      if (mode === "spin") updates.spin_count = spinCount + 1;

      const { error: updateError } = await supabaseAdmin
        .from("posts")
        .update(updates)
        .eq("id", postId);

      if (updateError) {
        console.error("Error updating post counts in webhook", updateError);
      }

      console.log(
        `Recorded ${mode} on post ${postId} from ${
          buyerEmail ?? "unknown user"
        }`
      );
    } catch (e) {
      console.error("Unhandled error in webhook handler", e);
    }
  }

  return NextResponse.json({ received: true });
}
