import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// --- Stripe setup ---
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  console.error("[Webhook] STRIPE_SECRET_KEY is missing");
}

if (!webhookSecret) {
  console.error("[Webhook] STRIPE_WEBHOOK_SECRET is missing");
}

const stripe = new Stripe(stripeSecretKey ?? "", {
  apiVersion: "2024-06-20" as any,
});

// --- Supabase admin client helper ---
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[Webhook] Supabase env:", {
    hasUrl: !!url,
    hasServiceKey: !!serviceKey,
  });

  if (!url || !serviceKey) {
    throw new Error(
      `Missing Supabase env: url=${!!url}, serviceKey=${!!serviceKey}`
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[Webhook] Error reading raw body:", err);
    return new NextResponse("Error reading raw body", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret!);
  } catch (err: any) {
    console.error(
      "[Webhook] Webhook signature verification failed:",
      err?.message
    );
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("[Webhook] ---- Event received ----");
  console.log("[Webhook] Type:", event.type);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const metadata = session.metadata ?? {};
      const kind =
        (metadata.paymentKind as string | undefined) ||
        (metadata.type as string | undefined) ||
        (metadata.mode as string | undefined);

      console.log("[Webhook] checkout.session.completed metadata:", metadata);
      console.log("[Webhook] Detected kind:", kind);

      // Only handle spinner payments here
      if (kind === "spin") {
        // Be forgiving about where the email/postId come from
        const userEmail =
          (metadata.userEmail as string | undefined) ||
          (metadata.user_email as string | undefined) ||
          (metadata.email as string | undefined) ||
          session.customer_details?.email ||
          session.customer_email ||
          null;

        const postId =
          (metadata.postId as string | undefined) ||
          (metadata.post_id as string | undefined) ||
          null;

        console.log("[Webhook][spin] candidate data:", {
          userEmail,
          postId,
          amount_total: session.amount_total,
          session_id: session.id,
        });

        if (!userEmail) {
          console.error(
            "[Webhook][spin] Missing userEmail; will NOT insert into spinner_spins",
            {
              metadata,
              customer_details: session.customer_details,
            }
          );
          // Still return 200 so Stripe doesn't keep retrying
          return new NextResponse("OK (missing userEmail for spin)", {
            status: 200,
          });
        }

        const supabase = getSupabaseAdmin();

        const { error: insertError } = await supabase
          .from("spinner_spins")
          .insert({
            user_email: userEmail,
            post_id: postId,
            status: "paid",
            checkout_session_id: session.id,
            amount_cents: session.amount_total ?? null,
            // outcome & reward_post_id remain null for now
          });

        if (insertError) {
          console.error("[Webhook] ❌ INSERT ERROR for spinner_spins:", {
            message: insertError.message,
            details: (insertError as any).details,
            hint: (insertError as any).hint,
            code: insertError.code,
          });
          // Don't throw – just log; Stripe has already succeeded taking payment
        } else {
          console.log(
            "[Webhook] ✅ spin row inserted into spinner_spins for session",
            session.id
          );
        }
      } else {
        console.log(
          "[Webhook] checkout.session.completed is not a spin payment; skipping spinner_spins insert"
        );
      }
    } else {
      console.log("[Webhook] Ignoring non-checkout.session.completed event");
    }
  } catch (err) {
    console.error("[Webhook] ❌ Unexpected error in handler:", err);
    // We still return 200 so Stripe doesn't endlessly retry
  }

  // Always 200 so Stripe doesn’t keep retrying if Supabase insert fails
  return new NextResponse("OK", { status: 200 });
}
