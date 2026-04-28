import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { streamId: string } }
) {
  const { streamId } = await params
  
  const stream = await prisma.muxLiveStream.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      muxPlaybackId: true,
      status: true,
      creatorEmail: true,
      liveStartedAt: true,
    },
  })

  if (!stream) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ stream })
}