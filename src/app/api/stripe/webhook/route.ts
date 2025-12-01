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

// --- Supabase admin client (service role, no RLS issues) ---
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

  // Stripe needs the *raw* body
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

    const rawPostId = metadata.postId as string | undefined;

    // Build the row in the least-risky way possible.
    // 1) Always set user_email (nullable is fine).
    // 2) Only send post_id if it *looks* like a UUID.
    const payload: Record<string, any> = {
      user_email: email || null,
    };

    // Basic UUID sanity check — this avoids “invalid input syntax for uuid”.
    if (rawPostId && /^[0-9a-fA-F-]{10,}$/.test(rawPostId)) {
      payload.post_id = rawPostId;
    }

    console.log("[Webhook] spinner_spins payload about to insert:", payload);

    if (kind === "spin") {
      try {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
          .from("spinner_spins")
          .insert(payload)
          .select("*");

        if (error) {
          console.error("[Webhook] ❌ INSERT ERROR for spinner_spins:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: error.code,
          });
        } else {
          console.log(
            "[Webhook] ✅ spin row inserted into spinner_spins:",
            data
          );
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

  // Always 200 so Stripe doesn’t keep retrying if Supabase insert fails
  return new NextResponse("OK", { status: 200 });
}
