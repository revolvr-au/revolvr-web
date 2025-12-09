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
    console.warn("[Webhook] metadata.postId is not a valid UUID, storing NULL:", {
      rawValue: value,
    });
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

    const supabase = getSupabaseAdmin();

    console.log("[Webhook] spin/live candidate:", {
      email,
      postIdRaw,
      postIdAfterValidation: postId,
      amount_total: session.amount_total,
      currency: session.currency,
      session_id: session.id,
    });

    // ------------------------------------------------------------
    // 1) LIVE STREAM SUPPORT (takes priority if sessionId + mode present)
    // ------------------------------------------------------------
    const liveSessionId = metadata.sessionId as string | undefined;
    const liveMode = metadata.mode as string | undefined; // "tip" | "boost" | "spin"
    const liveAmountCentsMeta = metadata.amountCents as string | undefined;
    const liveUserIdMeta = (metadata.userId as string | undefined) ?? null;

    if (liveSessionId && liveMode) {
      try {
        const amountCents =
          liveAmountCentsMeta != null
            ? Number(liveAmountCentsMeta)
            : session.amount_total ?? null;

        const { error } = await supabase.from("live_support").insert({
          session_id: liveSessionId,                // e.g. "revolvr-xxxx-uuid"
          user_id: liveUserIdMeta || email || null, // prefer userId, fall back to email
          mode: liveMode,                           // "tip" | "boost" | "spin"
          amount_cents: amountCents,
          checkout_session_id: session.id,
        });

        if (error) {
          console.error("[Webhook] ❌ Error recording live support:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          });
        } else {
          console.log(
            "[Webhook] ✅ Recorded live support for session",
            liveSessionId,
            "mode",
            liveMode
          );
        }
      } catch (err) {
        console.error("[Webhook] ❌ Fatal error recording live support:", err);
      }
    }

    // ------------------------------------------------------------
    // 2) SPINNER SPINS (no sessionId => treat as normal spin)
    // ------------------------------------------------------------
    else if (kind === "spin") {
      try {
        const { error } = await supabase.from("spinner_spins").insert({
          user_email: email || null,
          post_id: postId, // will be NULL if invalid
          status: "paid", // we know this is a completed payment
          checkout_session_id: session.id,
          amount_cents: session.amount_total ?? null,
        });

        if (error) {
          console.error(
            "[Webhook] ❌ INSERT / UPSERT ERROR for spinner_spins:",
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
      } catch (err) {
        console.error("[Webhook] ❌ Fatal error before insert:", err);
      }
    }

    // ------------------------------------------------------------
    // 3) Anything else – ignore, but log
    // ------------------------------------------------------------
    else {
      console.log(
        "[Webhook] Not a spin or live-support payment, skipping DB insert"
      );
    }
  } else {
    console.log("[Webhook] Ignoring non-checkout.session.completed event");
  }

  // Always 200 so Stripe doesn’t keep retrying if Supabase insert fails
  return new NextResponse("OK", { status: 200 });
}
