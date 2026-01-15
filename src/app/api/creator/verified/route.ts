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
        isVerified: true,
        verificationStatus: { in: ["blue", "gold"] },
      },
      select: { email: true, verificationStatus: true },
    });

    const verified: string[] = [];
    const tiers: Record<string, "blue" | "gold"> = {};

    for (const r of rows) {
      const em = String(r.email || "").trim().toLowerCase();
      const st = String(r.verificationStatus || "").trim().toLowerCase();
      if (!em) continue;

      if (st === "blue" || st === "gold") {
        verified.push(em);
        tiers[em] = st as "blue" | "gold";
      }
    }

    return NextResponse.json({ verified, tiers }, { status: 200 });
  } catch (err: any) {
    console.error("[api/creator/verified]", err?.message ?? err);
    // Fail closed: no verified badges if endpoint errors
    return NextResponse.json(
      { verified: [], tiers: {}, error: "Failed to lookup verified creators" },
      { status: 200 }
    );
  }
}
