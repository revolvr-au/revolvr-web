import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Supabase client (service role – server only!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("❌ Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("❌ Error reading raw body:", err);
    return new NextResponse("Error reading raw body", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("---- Webhook Event Received ----");
  console.log("Event type:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata ?? {};
    const kind =
      (metadata.paymentKind ||
        metadata.type ||
        metadata.mode) as string | undefined;

    console.log("---- checkout.session.completed ----");
    console.log("Raw metadata:", metadata);
    console.log("Detected payment kind:", kind);

    const email =
      metadata.userEmail ||
      session.customer_details?.email ||
      session.customer_email;

    const postId = metadata.postId || null;

    console.log("Email resolution:", {
      metaUserEmail: metadata.userEmail,
      customerDetailsEmail: session.customer_details?.email,
      customerEmail: session.customer_email,
      finalEmail: email,
      postId,
    });

    if (kind === "spin") {
      if (!email) {
        console.error("❌ No email resolved for spin payment – skipping insert");
      } else {
        console.log("INSERTING SPIN:", { email, postId });

        const { data, error } = await supabase
          .from("spinner_spins")
          .insert({ user_email: email, post_id: postId })
          .select();

        if (error) {
          console.error("❌ INSERT ERROR:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
        } else {
          console.log("✅ INSERT SUCCESS:", data);
        }
      }
    } else {
      console.log("ℹ️ Webhook ignored — not a spin payment");
    }
  }

  return new NextResponse("OK", { status: 200 });
}
