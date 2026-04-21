import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RingTier } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RING_TIERS_WITH_BADGE = new Set<RingTier>([
  "BLUE", "GOLD", "BUSINESS", "CORPORATE", "RED", "GOVERNMENT",
]);

// GET /api/creator/verified?emails=a@b.com,c@d.com
//
// Returns ring tier for each email. Primary source is ringTier (new system).
// Falls back to verificationStatus ("blue"/"gold") for legacy subscribers.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("emails") ?? "";

    const emails = raw
      .split(",")
      .map((e) => String(e || "").trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 200);

    if (emails.length === 0) {
      return NextResponse.json({ verified: [], tiers: {} }, { status: 200 });
    }

    const rows = await prisma.creatorProfile.findMany({
      where: { email: { in: emails } },
      select: {
        email:              true,
        ringTier:           true,
        ringExpiresAt:      true,
        verificationStatus: true, // legacy fallback
      },
    });

    const tiers: Record<string, RingTier> = {};
    const verified: string[] = [];
    const now = new Date();

    for (const r of rows) {
      const email = String(r.email || "").trim().toLowerCase();
      if (!email) continue;

      // Primary: new ringTier field
      let tier: RingTier | null = null;

      const rt = r.ringTier as RingTier | null;
      if (rt && RING_TIERS_WITH_BADGE.has(rt)) {
        // Check expiry — expired subs revert to NONE on next renewal event,
        // but guard here so display never shows a stale tier
        const expired = r.ringExpiresAt ? r.ringExpiresAt < now : false;
        if (!expired) tier = rt;
      }

      // Fallback: legacy verificationStatus for old blue/gold subscribers
      if (!tier) {
        const vs = String(r.verificationStatus ?? "").toLowerCase();
        if (vs === "gold") tier = "GOLD";
        else if (vs === "blue") tier = "BLUE";
      }

      if (tier) {
        verified.push(email);
        tiers[email] = tier;
      }
    }

    return NextResponse.json({ verified, tiers }, { status: 200 });
  } catch (err: any) {
    console.error("[api/creator/verified]", err?.message ?? err);
    return NextResponse.json(
      { verified: [], tiers: {}, error: "Failed to lookup verified creators" },
      { status: 200 }
    );
  }
}
