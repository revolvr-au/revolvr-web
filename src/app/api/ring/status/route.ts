import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/ring/status — returns ring tier for the authenticated user
export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ ringTier: "NONE", loggedIn: false });
  }

  const email = user.email.trim().toLowerCase();
  const profile = await prisma.creatorProfile.findUnique({
    where: { email },
    select: {
      ringTier:        true,
      ringActivatedAt: true,
      ringExpiresAt:   true,
      voltage:         true,
      voltageQualified: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ ringTier: "NONE", loggedIn: true });
  }

  const now = new Date();
  const expired = profile.ringExpiresAt ? profile.ringExpiresAt < now : false;
  const effectiveTier = expired ? "NONE" : (profile.ringTier ?? "NONE");

  return NextResponse.json({
    loggedIn:        true,
    ringTier:        effectiveTier,
    ringActivatedAt: profile.ringActivatedAt,
    ringExpiresAt:   profile.ringExpiresAt,
    voltage:         profile.voltage ?? 0,
    voltageQualified: profile.voltageQualified ?? false,
    goldEligible:    (profile.voltage ?? 0) >= 50 || (profile.voltageQualified ?? false),
  });
}
