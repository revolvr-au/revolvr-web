import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export async function POST(_req: NextRequest) {
  try {
    // Supabase SSR auth (matches /api/creator/me)
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = (user.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Missing user email" }, { status: 400 });
    }

    // Resolve creator profile ONLY for logged-in user
    const creator = await prisma.creatorProfile.findUnique({
      where: { email },
      select: { id: true, stripeCustomerId: true },
    });

    if (!creator) {
      return NextResponse.json(
        { error: "Creator profile not found for authenticated user" },
        { status: 404 }
      );
    }

    if (!creator.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file yet (complete checkout first)." },
        { status: 400 }
      );
    }

    // Optional: enforce config in production if you want strictness
    // if (process.env.NODE_ENV === "production" && !process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID) {
    //   return NextResponse.json({ error: "Billing portal not configured" }, { status: 500 });
    // }

    const session = await stripe.billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: new URL("/creator?billing=return", SITE_URL).toString(),
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    const detail =
      err?.raw?.message ??
      err?.message ??
      (typeof err === "string" ? err : JSON.stringify(err));

    console.error("[payments/verification/portal]", detail);

    // Don’t leak Stripe internals to client in production
    const safeDetail = process.env.NODE_ENV === "production" ? undefined : detail;

    return NextResponse.json(
      { error: "Failed to create billing portal session", detail: safeDetail },
      { status: 500 }
    );
  }
}
