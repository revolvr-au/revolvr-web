import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();

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

    const row = await prisma.follow.findFirst({
      where: {
        followerEmail: viewerEmail,
        followingEmail: targetEmail,
      } as any,
      select: { id: true },
    });

    return NextResponse.json({ following: Boolean(row?.id) });
  } catch (e) {
    console.error("GET /api/follow/status error:", e);
    return NextResponse.json({ following: false });
  }
}
