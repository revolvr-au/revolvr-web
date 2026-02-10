import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const viewer = String(searchParams.get("viewer") ?? "").trim().toLowerCase();
    const target = String(searchParams.get("target") ?? "").trim().toLowerCase();

    if (!viewer || !target || viewer === target) {
      return NextResponse.json({ following: false });
    }

    const existing = await prisma.follow.findFirst({
      where: {
        followerEmail: viewer,
        followingEmail: target,
      },
      select: { id: true },
    });

    return NextResponse.json({ following: !!existing });
  } catch (err: any) {
    console.error("GET /api/follow/status error:", err);
    return NextResponse.json({ following: false }, { status: 500 });
  }
}
