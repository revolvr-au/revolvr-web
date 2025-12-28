import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/creator/verified?emails=a@b.com,c@d.com
 * Returns: { verified: ["a@b.com"] }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("emails") || "";

    const emails = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 200); // safety cap

    if (emails.length === 0) {
      return NextResponse.json({ verified: [] }, { status: 200 });
    }

    const rows = await prisma.creatorProfile.findMany({
      where: { email: { in: emails } },
      select: {
        email: true,
        // these columns exist in your DB screenshots:
        isVerified: true,
      },
    });

    const verified = rows
      .filter((r) => Boolean(r.isVerified))
      .map((r) => String(r.email).toLowerCase());

    return NextResponse.json({ verified }, { status: 200 });
  } catch (e) {
    console.error("[api/creator/verified] error", e);
    return NextResponse.json({ verified: [], error: "Server error" }, { status: 500 });
  }
}
