import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CURRENCY = "aud";

function normCurrency(v: unknown) {
  const c = String(v ?? DEFAULT_CURRENCY).trim().toLowerCase();
  return c || DEFAULT_CURRENCY;
}

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
      .slice(0, 200);

    if (emails.length === 0) {
      return NextResponse.json({ verified: [], currencies: {} }, { status: 200 });
    }

      const rows = await prisma.creatorProfile.findMany({
  where: {
    OR: emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })),
  },
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
      currencies[e] = normCurrency(r.payoutCurrency);
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
