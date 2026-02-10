import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const viewerEmail = String(url.searchParams.get("viewer") ?? "").trim().toLowerCase();
    const targetEmail = String(url.searchParams.get("target") ?? "").trim().toLowerCase();

    if (!viewerEmail.includes("@") || !targetEmail.includes("@")) {
      return NextResponse.json({ following: false });
    }
    if (viewerEmail === targetEmail) {
      return NextResponse.json({ following: false });
    }

    const row = await prisma.follow.findFirst({
      where: { viewerEmail, targetEmail } as any,
      select: { id: true },
    });

    return NextResponse.json({ following: Boolean(row) });
  } catch (e) {
    console.error("GET /api/follow/status error:", e);
    return NextResponse.json({ following: false });
  }
}
