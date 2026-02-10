import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // query params (UI/API)
    const viewerEmail = String(url.searchParams.get("viewer") ?? "").trim().toLowerCase();
    const targetEmail = String(url.searchParams.get("target") ?? "").trim().toLowerCase();

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ following: false });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ following: false });
    }

    const followerEmail = viewerEmail;
    const followingEmail = targetEmail;

    const row = await (prisma as any).follow.findFirst({
      where: { followerEmail, followingEmail },
      select: { id: true },
    });

    return NextResponse.json({ following: Boolean(row) });
  } catch (e) {
    console.error("GET /api/follow/status error:", e);
    return NextResponse.json({ following: false });
  }
}
