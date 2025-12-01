import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Webhook] ❌ Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[Webhook] ❌ Error reading raw body:", err);
    return new NextResponse("Error reading raw body", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error(
      "[Webhook] ❌ Webhook signature verification failed:",
      err.message
    );
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("[Webhook] ✅ Event received", {
    id: event.id,
    type: event.type,
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata ?? {};

    const kind = (metadata.paymentKind ||
      metadata.type ||
      metadata.mode) as string | undefined;

    const email =
      metadata.userEmail ||
      session.customer_details?.email ||
      session.customer_email;

    const postId = (metadata.postId as string | null) ?? null;

    console.log("[Webhook] checkout.session.completed", {
      kind,
      email,
      postId,
      sessionId: session.id,
    });

    if (kind === "spin") {
      console.log("[Webhook] → inserting into spinner_spins");

      const { data, error } = await supabaseAdmin
        .from("spinner_spins")
        .insert({
          user_email: email,
          post_id: postId,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[Webhook] ❌ INSERT ERROR for spinner_spins:", error);
        // Surface this so Stripe can show 500 in the dashboard if it fails
        return new NextResponse("Supabase insert error", { status: 500 });
      }

      console.log("[Webhook] ✅ INSERTED spinner spin row:", data);
    } else {
      console.log("[Webhook] (ignored) payment kind:", kind);
    }
  }

  return new NextResponse("OK", { status: 200 });
}
