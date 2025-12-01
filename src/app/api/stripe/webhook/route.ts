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

// Small helper so we don’t blow up on bad UUIDs
function isLikelyUuid(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(trimmed)) return trimmed;
  return null;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // ----- raw body for Stripe -----
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

  console.log("────────────────────────────────────────────");
  console.log("[Webhook] Event type:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};

    const kind =
      (metadata.paymentKind ||
        metadata.type ||
        metadata.mode) as string | undefined;

    console.log("[Webhook] metadata:", metadata);
    console.log("[Webhook] detected payment kind:", kind);

    const email =
      (metadata.userEmail as string | undefined) ||
      session.customer_details?.email ||
      session.customer_email ||
      "";

    const rawPostId = metadata.postId as string | undefined;
    const safePostId = isLikelyUuid(rawPostId);

    console.log("[Webhook] spin candidate:", {
      email,
      rawPostId,
      safePostId,
      amount_total: session.amount_total,
      currency: session.currency,
      checkout_session_id: session.id,
    });

    // Only handle “spin” payments
    if (kind === "spin") {
      try {
        const supabase = getSupabaseAdmin();

        // ultra–simple, constraint-safe payload
        const payload = {
          user_email: email || "unknown@revolvr.app",
          status: "paid",
          post_id: safePostId, // null if not a valid UUID
          checkout_session_id: session.id,
          amount_cents:
            typeof session.amount_total === "number"
              ? session.amount_total
              : null,
        };

        console.log("[Webhook] inserting into spinner_spins:", payload);

        const { data, error } = await supabase
          .from("spinner_spins")
          .insert(payload)
          .select("id")
          .single();

        if (error) {
          console.error(
            "[Webhook] ❌ INSERT / UPSERT ERROR for spinner_spins:",
            {
              message: error.message,
              details: (error as any).details,
              hint: (error as any).hint,
              code: error.code,
            }
          );
        } else {
          console.log(
            "[Webhook] ✅ spin row inserted into spinner_spins with id:",
            data?.id
          );
        }
      } catch (err) {
        console.error("[Webhook] ❌ Fatal error before/around insert:", err);
      }
    } else {
      console.log("[Webhook] Not a spin payment, skipping DB insert");
    }
  } else {
    console.log(
      "[Webhook] Ignoring non-checkout.session.completed event:", 
      event.type
    );
  }

  // Always 200 so Stripe doesn’t spam retries.
  return new NextResponse("OK", { status: 200 });
}
