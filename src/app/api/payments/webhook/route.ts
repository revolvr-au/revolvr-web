// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // make sure this is here

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Re-use your existing API version setup if you had one.
  // This cast avoids the weird "2025-11-17.clover" type issue.
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
});

// Admin Supabase client (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("Missing Stripe signature", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("❌ Stripe webhook signature error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // We only care about successful checkouts
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const mode = session.metadata?.mode;        // "tip" | "boost" | whatever we send
    const postId = session.metadata?.postId;    // we already send this for boosts
    const userEmail =
      session.customer_details?.email ?? session.metadata?.userEmail ?? null;

    console.log("✅ checkout.session.completed", {
      mode,
      postId,
      userEmail,
    });

    // If it's a boost, mark the post as boosted for 24h
    if (mode === "boost" && postId) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

      const { error } = await supabaseAdmin
        .from("posts")
        .update({
          is_boosted: true,
          boost_expires_at: expiresAt.toISOString(),
        })
        .eq("id", postId);

      if (error) {
        console.error("❌ Failed to mark post as boosted", error);
      } else {
        console.log("✨ Post boosted in DB", { postId, expiresAt });
      }
    }
  }

  // Always return 200 so Stripe doesn't keep retrying (unless we had a signature error above)
  return new NextResponse("ok", { status: 200 });
}
