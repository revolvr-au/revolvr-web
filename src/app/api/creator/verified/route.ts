import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/creator/verified?emails=a@b.com,c@d.com
 * Returns:
 * {
 *   verified: ["a@b.com"],
 *   currencies: { "a@b.com": "aud", "c@d.com": "usd" }
 * }
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
      return NextResponse.json({ verified: [], currencies: {} }, { status: 200 });
    }

    const rows = await prisma.creatorProfile.findMany({
      where: { email: { in: emails } },
      select: {
        email: true,
        isVerified: true,
        payoutCurrency: true,
      },
    });

    const verified = rows
      .filter((r) => Boolean(r.isVerified))
      .map((r) => String(r.email).toLowerCase());

    const currencies: Record<string, string> = {};
    for (const r of rows) {
      const e = String(r.email).toLowerCase();
      const c = String(r.payoutCurrency ?? "aud").trim().toLowerCase();
      currencies[e] = c || "aud";
    }

    return NextResponse.json({ verified, currencies }, { status: 200 });
  } catch (e) {
    console.error("[api/creator/verified] error", e);
    return NextResponse.json(
      { verified: [], currencies: {}, error: "Server error" },
      { status: 500 }
    );
  }
}
