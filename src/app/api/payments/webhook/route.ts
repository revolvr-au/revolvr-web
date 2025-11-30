import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Type hack because Stripe's TS types expect a literal:
  apiVersion: "2024-06-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Admin Supabase client (service role)
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }

  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET env var");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("Stripe webhook called without signature header");
    return new NextResponse("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Stripe webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // We only care about successful checkout sessions for now
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Try to be backwards-compatible with previous metadata keys
    const paymentKind =
      session.metadata?.paymentKind ??
      session.metadata?.mode ??
      session.metadata?.type ??
      null;

    const userEmail =
      session.metadata?.userEmail ||
      session.customer_email ||
      null;

    const postId = session.metadata?.postId || null;

    console.log("✅ checkout.session.completed", {
      paymentKind,
      userEmail,
      postId,
      sessionId: session.id,
    });

    const supabase = getSupabaseAdmin();

    try {
      if (paymentKind === "spin") {
        // Record a spin in spinner_spins
        const { error } = await supabase.from("spinner_spins").insert({
          user_email: userEmail,
          post_id: postId || null,
        });

        if (error) {
          console.error("Error inserting spinner_spins row:", error);
        } else {
          console.log("🎯 Recorded spinner spin in spinner_spins");
        }
      } else if (paymentKind === "boost" && postId) {
        // 24h boost window
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Mark the post as boosted
        const { error: updateErr } = await supabase
          .from("posts")
          .update({
            is_boosted: true,
            boost_expires_at: expiresAt.toISOString(),
          })
          .eq("id", postId);

        if (updateErr) {
          console.error("Error updating boosted post:", updateErr);
        } else {
          console.log("⚡ Marked post as boosted:", postId);
        }

        // Optional: track in boosts table if it exists
        const { error: boostErr } = await supabase.from("boosts").insert({
          user_email: userEmail,
          post_id: postId,
          boost_expires_at: expiresAt.toISOString(),
        });

        if (boostErr) {
          console.warn(
            "Could not insert into boosts table (ok if table/cols differ):",
            boostErr
          );
        }
      } else {
        console.log("Ignoring checkout.session.completed with kind:", paymentKind);
      }
    } catch (err) {
      console.error("Unhandled error in webhook handler:", err);
      // We still return 200 so Stripe doesn't retry forever, but logs will show the issue.
    }
  } else {
    console.log("Ignoring Stripe event type:", event.type);
  }

  return NextResponse.json({ received: true });
}
