import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const viewerEmail = normEmail(url.searchParams.get("viewer"));
    const targetEmail = normEmail(url.searchParams.get("target"));

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ following: false });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ following: false });
    }

    // Try viewer/target
    try {
      const row = await (prisma as any).follow.findFirst({
        where: { viewerEmail, targetEmail },
        select: { id: true },
      });
      return NextResponse.json({ following: Boolean(row?.id) });
    } catch {}

    // Try follower/following
    const row2 = await (prisma as any).follow.findFirst({
      where: { followerEmail: viewerEmail, followingEmail: targetEmail },
      select: { id: true },
    });

    return NextResponse.json({ following: Boolean(row2?.id) });
  } catch (e) {
    console.error("GET /api/follow/status error:", e);
    return NextResponse.json({ following: false });
  }
}
