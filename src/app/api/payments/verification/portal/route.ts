import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeSecretKey);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

type Body = {
  creatorProfileId?: string | null;
  creatorEmail?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<Body>;

    // Resolve creator profile (prefer ID; fallback to email)
    let creator:
      | null
      | { id: string; email: string | null; stripeCustomerId: string | null } = null;

    if (body.creatorProfileId) {
      creator = await prisma.creatorProfile.findUnique({
        where: { id: String(body.creatorProfileId) },
        select: { id: true, email: true, stripeCustomerId: true },
      });
    } else if (body.creatorEmail) {
      const email = String(body.creatorEmail || "").trim().toLowerCase();
      creator = await prisma.creatorProfile.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true, stripeCustomerId: true },
      });
    }

    if (!creator) {
      return NextResponse.json(
        { error: "Creator not found (provide creatorProfileId or creatorEmail)" },
        { status: 404 }
      );
    }

    if (!creator.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file yet (complete checkout first)." },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: creator.stripeCustomerId,
      return_url: new URL("/creator", SITE_URL).toString(),
      configuration: process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    const detail =
      err?.raw?.message ??
      err?.message ??
      (typeof err === "string" ? err : JSON.stringify(err));

    console.error("[payments/verification/portal]", detail);

    return NextResponse.json(
      { error: "Failed to create billing portal session", detail },
      { status: 500 }
    );
  }
}
