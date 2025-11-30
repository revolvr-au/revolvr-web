import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // webhooks must run on Node, not Edge

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("Missing stripe-signature header");
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log("Received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const metadata = session.metadata ?? {};
    const kind =
      (metadata.paymentKind ||
        metadata.type ||
        metadata.mode) as string | undefined;

    console.log("checkout.session.completed kind:", kind, "metadata:", metadata);

    if (kind === "spin") {
      const email =
        metadata.userEmail ||
        session.customer_details?.email ||
        session.customer_email;

      const postId = metadata.postId || null;

      console.log("Inserting spinner spin for", email, "postId:", postId);

      const { error } = await supabase
        .from("spinner_spins")
        .insert({ user_email: email, post_id: postId });

      if (error) {
        console.error("Error inserting spinner spin:", error);
      } else {
        console.log("✅ Inserted spinner spin row for", email);
      }
    } else {
      console.log("Ignoring spin, unrecognised kind:", kind);
    }
  }

  return new NextResponse("OK", { status: 200 });
}
