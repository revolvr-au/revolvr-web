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
      return NextResponse.json({ verified: [] }, { status: 200 });
    }

    const now = new Date();

    const rows = await prisma.creatorProfile.findMany({
      where: {
        email: { in: emails },
        OR: [
          { isVerified: true },
          { verificationStatus: { in: ["blue", "gold"] } },
          { verificationCurrentPeriodEnd: { gt: now } },
        ],
      },
      select: { email: true },
    });

    const verified = rows
      .map((r) => String(r.email || "").trim().toLowerCase())
      .filter(Boolean);

    return NextResponse.json({ verified }, { status: 200 });
  } catch (err: any) {
    console.error("[api/creator/verified]", err?.message ?? err);
    return NextResponse.json(
      { verified: [], error: "Failed to lookup verified creators" },
      { status: 200 }
    );
  }
}
