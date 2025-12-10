// src/app/api/stripe/webhook/route.ts
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

// quick + dirty UUID check – good enough for our case
function looksLikeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    console.warn(
      "[Webhook] metadata.postId is not a valid UUID, storing NULL:",
      {
        rawValue: value,
      }
    );
    return null;
  }
  return trimmed;
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata ?? {};
    const kind =
      (metadata.paymentKind ||
        metadata.type ||
        metadata.mode) as string | undefined;

    console.log("[Webhook] checkout.session.completed metadata:", metadata);
    console.log("[Webhook] Detected kind:", kind);

    const email =
      (metadata.userEmail as string | undefined) ||
      session.customer_details?.email ||
      session.customer_email ||
      "";

    const postIdRaw = metadata.postId as string | undefined;
    const postId = looksLikeUuid(postIdRaw);

    console.log("[Webhook] spin/live candidate:", {
      email,
      postIdRaw,
      postIdAfterValidation: postId,
      amount_total: session.amount_total,
      currency: session.currency,
      session_id: session.id,
    });

    try {
      const supabase = getSupabaseAdmin();

      // 1️⃣ Existing spinner spins (feed)
      if (kind === "spin" && !metadata.liveSessionId) {
        const { error } = await supabase.from("spinner_spins").insert({
          user_email: email || null,
          post_id: postId, // will be NULL if invalid
          status: "paid",
          checkout_session_id: session.id,
          amount_cents: session.amount_total ?? null,
        });

        if (error) {
          console.error(
            "[Webhook] ❌ INSERT ERROR for spinner_spins:",
            {
              message: error.message,
              details: (error as any).details,
              hint: (error as any).hint,
              code: (error as any).code,
            }
          );
        } else {
          console.log(
            "[Webhook] ✅ spin row inserted into spinner_spins for session",
            session.id
          );
        }
      }
      // 2️⃣ NEW: live stream tips / boosts / spins
      else if (
        kind === "live_tip" ||
        kind === "live_boost" ||
        kind === "live_spin"
      ) {
        const liveSessionId = metadata.liveSessionId as string | undefined;
        if (!liveSessionId) {
          console.warn(
            "[Webhook] live_* payment without liveSessionId, skipping",
            { metadata }
          );
        } else {
          const mode =
            kind === "live_tip"
              ? "tip"
              : kind === "live_boost"
              ? "boost"
              : "spin";

          const { error } = await supabase.from("live_support").insert({
            session_id: liveSessionId,
            user_email: email || null,
            mode,
            amount_cents: session.amount_total ?? null,
            checkout_session_id: session.id,
          });

          if (error) {
            console.error(
              "[Webhook] ❌ INSERT ERROR for live_support:",
              {
                message: error.message,
                details: (error as any).details,
                hint: (error as any).hint,
                code: (error as any).code,
              }
            );
          } else {
            console.log(
              "[Webhook] ✅ live_support row inserted for live session",
              liveSessionId
            );
          }
        }
      } else {
        console.log("[Webhook] Not a spin or live_* payment, skipping DB insert");
      }
    } catch (err) {
      console.error("[Webhook] ❌ Fatal error before insert:", err);
    }
  } else {
    console.log("[Webhook] Ignoring non-checkout.session.completed event");
  }

  // Always 200 so Stripe doesn’t keep retrying if Supabase insert fails
  return new NextResponse("OK", { status: 200 });
}
