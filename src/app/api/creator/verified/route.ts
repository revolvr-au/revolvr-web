import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/creator/verified?emails=a@b.com,c@d.com
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
      where: {
        email: { in: emails },
        // Consider verified if isVerified true OR verificationStatus explicitly set
        OR: [
          { isVerified: true },
          { verificationStatus: { in: ["blue", "gold"] } },
        ],
      },
      select: { email: true, verificationStatus: true, isVerified: true },
    });

    const tiers: Record<string, "blue" | "gold"> = {};
    const verified: string[] = [];

    for (const r of rows) {
      const email = String(r.email || "").trim().toLowerCase();
      if (!email) continue;

      const s = String(r.verificationStatus ?? "").trim().toLowerCase();
      const tier = s === "gold" ? "gold" : "blue";

      // If the record qualifies, return it (blue default, gold if set)
      verified.push(email);
      tiers[email] = tier;
    }

    return NextResponse.json({ verified, tiers }, { status: 200 });
  } catch (err: any) {
    console.error("[api/creator/verified]", err?.message ?? err);
    // Fail closed: no badges if endpoint errors
    return NextResponse.json(
      { verified: [], tiers: {}, error: "Failed to lookup verified creators" },
      { status: 200 }
    );
  }
}
