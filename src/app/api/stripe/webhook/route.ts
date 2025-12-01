import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// ---------- Stripe setup ----------
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

// ---------- Supabase admin client ----------
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

// ---------- Webhook handler ----------
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata ?? {};
    const kind =
      (metadata.paymentKind ||
        metadata.type ||
        metadata.mode) as string | undefined;

    console.log("[Webhook] checkout.session.completed metadata:", metadata);
    console.log("[Webhook] Detected kind:", kind);

    // Try very hard to get an email, but never send NULL to DB
    const rawEmail =
      (metadata.userEmail as string | undefined) ||
      session.customer_details?.email ||
      session.customer_email ||
      "";

    const email = rawEmail || "unknown@spinner"; // <- always non-empty string

    const postId = (metadata.postId as string | undefined) ?? null;

    const checkoutSessionId = session.id; // always present
    const amountCents =
      (session.amount_total as number | null | undefined) ?? null;

    console.log("[Webhook] spin candidate:", {
      email,
      postId,
      checkoutSessionId,
      amountCents,
    });

    if (kind === "spin") {
      try {
        const supabase = getSupabaseAdmin();

        // Upsert on checkout_session_id to handle Stripe retries safely
        const { error } = await supabase
          .from("spinner_spins")
          .upsert(
            {
              user_email: email,
              post_id: postId,
              checkout_session_id: checkoutSessionId,
              amount_cents: amountCents,
            },
            { onConflict: "checkout_session_id" }
          );

        if (error) {
          console.error(
            "[Webhook] ❌ INSERT / UPSERT ERROR for spinner_spins:",
            {
              message: error.message,
              details: (error as any).details,
              hint: (error as any).hint,
              code: error.code,
              full: error, // just in case
            }
          );
        } else {
          console.log(
            "[Webhook] ✅ spin row upserted into spinner_spins (or already existed)"
          );
        }
      } catch (err) {
        console.error("[Webhook] ❌ Fatal error before DB write:", err);
      }
    } else {
      console.log("[Webhook] Not a spin payment, skipping DB insert");
    }
  } else {
    console.log("[Webhook] Ignoring non-checkout.session.completed event");
  }

  // Always 200 so Stripe doesn’t keep retrying if Supabase write fails
  return new NextResponse("OK", { status: 200 });
}
