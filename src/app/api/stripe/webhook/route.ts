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
      `Missing Supabase env: url=${!!url}, serviceKey=${!!serviceKey}`,
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// ---------- Handler ----------
export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Webhook] Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  // Stripe *must* get raw text body
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
      err?.message,
    );
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("[Webhook] ---- Event received ----");
  console.log("[Webhook] Type:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = (session.metadata ?? {}) as Record<string, string>;

    const kind =
      metadata.paymentKind || metadata.type || metadata.mode || undefined;

    console.log("[Webhook] checkout.session.completed metadata:", metadata);
    console.log("[Webhook] Detected kind:", kind);

    // --- email: make sure it’s NEVER null/empty (column is NOT NULL) ---
    const emailCandidate =
      metadata.userEmail ||
      metadata.user_email ||
      session.customer_details?.email ||
      session.customer_email ||
      "";

    const userEmail =
      emailCandidate.trim() !== ""
        ? emailCandidate.trim().toLowerCase()
        : "anonymous@revolvr.app";

    // --- postId: avoid invalid uuid / empty string for uuid column ---
    const rawPostId =
      metadata.postId || metadata.post_id || (metadata.postID as string) || "";
    const postId =
      rawPostId && rawPostId.trim().length > 0 ? rawPostId.trim() : null;

    // --- extra fields (not strictly required, but useful) ---
    const checkoutSessionId = session.id;
    const amountCents =
      typeof session.amount_total === "number" ? session.amount_total : null;

    console.log("[Webhook] Spin candidate payload:", {
      kind,
      userEmail,
      postId,
      checkoutSessionId,
      amountCents,
    });

    if (kind === "spin") {
      try {
        const supabase = getSupabaseAdmin();

        const insertPayload = {
          user_email: userEmail,          // text NOT NULL
          post_id: postId,                // uuid or null
          checkout_session_id: checkoutSessionId,
          amount_cents: amountCents,
          status: "paid" as const,
        };

        console.log("[Webhook] Inserting into spinner_spins:", insertPayload);

        const { error } = await supabase
          .from("spinner_spins")
          .insert(insertPayload);

        if (error) {
          console.error(
            "[Webhook] ❌ INSERT / UPSERT ERROR for spinner_spins:",
            error.message,
            JSON.stringify(error, null, 2),
          );
        } else {
          console.log("[Webhook] ✅ spin row inserted into spinner_spins");
        }
      } catch (err) {
        console.error("[Webhook] ❌ Fatal error before insert:", err);
      }
    } else {
      console.log("[Webhook] Not a spin payment, skipping DB insert");
    }
  } else {
    console.log("[Webhook] Ignoring non-checkout.session.completed event");
  }

  // Always 200 so Stripe doesn’t keep retrying
  return new NextResponse("OK", { status: 200 });
}
