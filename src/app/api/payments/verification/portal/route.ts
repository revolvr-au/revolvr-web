import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { getUserFromRequest } from "@/lib/auth"; // <-- replace with your real auth helper

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    // 1) Authenticate request (replace with your real mechanism)
    // const user = await getUserFromRequest(req);
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) Resolve creator profile for authenticated user
    // Example if you store email on auth user:
    // const email = user.email?.trim().toLowerCase();
    // if (!email) return NextResponse.json({ error: "Missing user email" }, { status: 400 });

    // const creator = await prisma.creatorProfile.findFirst({
    //   where: { email: { equals: email, mode: "insensitive" } },
    //   select: { id: true, stripeCustomerId: true },
    // });

    // TEMP fallback (NOT SAFE): current behavior
    const body = (await req.json().catch(() => ({}))) as any;
    const creator = body?.creatorProfileId
      ? await prisma.creatorProfile.findUnique({
          where: { id: String(body.creatorProfileId) },
          select: { id: true, stripeCustomerId: true },
        })
      : null;

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    if (!creator.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file yet (complete checkout first)." },
        { status: 400 }
      );
    }

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

    // Don’t leak Stripe internals to client in prod
    const safeDetail =
      process.env.NODE_ENV === "production" ? undefined : detail;

    return NextResponse.json(
      { error: "Failed to create billing portal session", detail: safeDetail },
      { status: 500 }
    );
  }
}
