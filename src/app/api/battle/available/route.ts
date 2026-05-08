import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const openBattle = await prisma.liveBattle.findFirst({
      where: { status: "seeking" },
      orderBy: { createdAt: "asc" },
      select: { id: true, creatorEmailA: true, streamIdA: true },
    });

    if (!openBattle) {
      return NextResponse.json({ available: false });
    }

    return NextResponse.json({
      available: true,
      battleId: openBattle.id,
      seekerEmail: openBattle.creatorEmailA,
    });
  } catch (e: any) {
    return NextResponse.json({ available: false });
  }
}