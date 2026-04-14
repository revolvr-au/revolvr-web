import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const userRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        Authorization: auth,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    }
  );

  if (!userRes.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const user = await userRes.json();
  const email = user.email.toLowerCase();

  const creator = await prisma.creatorProfile.findUnique({ where: { email } });
  if (!creator) {
    return NextResponse.json({ error: "not a creator" }, { status: 403 });
  }

  if (creator.stripeAccountId) {
    return NextResponse.json({ ok: true });
  }

  const account = await stripe.accounts.create({
    type: "express",
    email,
    country: "AU",
    capabilities: {
      transfers: { requested: true },
    },
  });

  await prisma.creatorProfile.update({
    where: { email },
    data: {
      stripeAccountId: account.id,
      stripeOnboardingStatus: "started",
    },
  });

  return NextResponse.json({ ok: true });
}
