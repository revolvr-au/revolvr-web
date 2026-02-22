import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const activeSession = await prisma.liveSession.findFirst({
    where: { isActive: true },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      creatorName: true,
    },
  });

  if (!activeSession) {
    return NextResponse.json({ isLive: false });
  }

  return NextResponse.json({
    isLive: true,
    sessionId: activeSession.id,
    creatorName: activeSession.creatorName,
  });
}