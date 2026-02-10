import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const viewerEmail = norm(url.searchParams.get("viewer"));
    const targetEmail = norm(url.searchParams.get("target"));

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ following: false });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ following: false });
    }

    // Try viewerEmail + targetEmail
    try {
      const row = await (prisma as any).follow.findFirst({
        where: { viewerEmail, targetEmail },
        select: { id: true },
      });
      if (row?.id) return NextResponse.json({ following: true });
    } catch {}

    // Try viewerEmail + followingEmail
    const row2 = await (prisma as any).follow.findFirst({
      where: { viewerEmail, followingEmail: targetEmail },
      select: { id: true },
    });

    return NextResponse.json({ following: Boolean(row2?.id) });
  } catch (e) {
    console.error("GET /api/follow/status error:", e);
    return NextResponse.json({ following: false });
  }
}
