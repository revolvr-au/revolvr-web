import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { creatorName } = await req.json();
    if (!creatorName) {
      return NextResponse.json({ success: false, error: "Missing creatorName" }, { status: 400 });
    }
    await prisma.liveSession.updateMany({
      where: { creatorName, isActive: true },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LIVE STOP ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}