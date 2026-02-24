import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { creatorName } = await req.json();

    if (!creatorName) {
      return NextResponse.json(
        { success: false, error: "Missing creatorName" },
        { status: 400 }
      );
    }

    // Deactivate only this creator's active session
    await prisma.liveSession.updateMany({
      where: {
        creatorName,
        isActive: true,
      },
      data: { isActive: false },
    });

    const sessionId = randomUUID();

    const session = await prisma.liveSession.create({
      data: {
        id: sessionId,
        creatorName,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      session,
      sessionId,
    });
  } catch (error) {
    console.error("LIVE START ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}