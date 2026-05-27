import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RingTier } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TIERS = new Set<string>(["BLUE", "GOLD", "BUSINESS", "CORPORATE", "RED", "GOVERNMENT", "NONE"]);

// POST /api/ring/admin/grant
// Body: { email: string, tier: RingTier }
// Header: x-studio-secret: <STUDIO_SECRET>
//
// Used by Westley to manually grant/revoke ring tiers (Red Ring invites, Government rings).
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-studio-secret");
  if (!secret || secret !== process.env.STUDIO_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const tier  = String(body.tier  ?? "").toUpperCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: `Invalid tier. Must be one of: ${[...VALID_TIERS].join(", ")}` }, { status: 400 });
  }

  const now  = new Date();
  const data =
    tier === "NONE"
      ? { ringTier: "NONE" as RingTier, ringActivatedAt: null, ringExpiresAt: null }
      : {
          ringTier:        tier as RingTier,
          ringActivatedAt: now,
          ringExpiresAt:   tier === "GOVERNMENT" ? null : null, // Government = no expiry; others set by Stripe
        };

  const profile = await prisma.creatorProfile.upsert({
    where: { email },
    update: data,
    create: {
      email,
      displayName: email.split("@")[0],
      status:      "ACTIVE",
      ...data,
    },
    select: { email: true, ringTier: true, ringActivatedAt: true },
  });

  console.log(`[ring/admin/grant] ${tier} granted to ${email}`);

  return NextResponse.json({ ok: true, profile });
}
