import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { creatorName, roomId } = await req.json();

    // Deactivate previous sessions
    await prisma.liveSession.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const session = await prisma.liveSession.create({
      data: {
        id: roomId,
        creatorName,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("LIVE START ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}