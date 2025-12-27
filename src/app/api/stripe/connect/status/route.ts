import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getUserEmailFromBearer(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!apikey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey },
    cache: "no-store",
  });

  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user?.email ? String(user.email).trim().toLowerCase() : null;
}

export async function GET(req: Request) {
  try {
    const email = await getUserEmailFromBearer(req);
    if (!email) return jsonError("Not authenticated", 401);

    const profile = await prisma.creatorProfile.findUnique({ where: { email } });
    if (!profile) return jsonError("Creator not found.", 404);

    if (!profile.stripeAccountId) {
      return NextResponse.json({
        ok: true,
        connected: false,
        onboardingStatus: profile.stripeOnboardingStatus,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    const acct = await stripe.accounts.retrieve(profile.stripeAccountId);

    const chargesEnabled = Boolean((acct as any).charges_enabled);
    const payoutsEnabled = Boolean((acct as any).payouts_enabled);

    // update DB so UI doesn't guess
    await prisma.creatorProfile.update({
      where: { email },
      data: {
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeOnboardingStatus: chargesEnabled && payoutsEnabled ? "complete" : "pending",
      },
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      onboardingStatus: chargesEnabled && payoutsEnabled ? "complete" : "pending",
      chargesEnabled,
      payoutsEnabled,
      stripeAccountId: profile.stripeAccountId,
    });
  } catch (e) {
    console.error("[api/stripe/connect/status] error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
