import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { streamId: string } }
) {
  const { streamId } = await params

  // Try IVS post first
  const post = await prisma.post.findUnique({
    where: { id: streamId },
    select: {
      id: true,
      postType: true,
      ivsPlaybackUrl: true,
      liveEndedAt: true,
      userEmail: true,
      caption: true,
    }
  })

  if (post && post.postType === 'LIVE') {
    // Get creator profile
    const [profile, creator] = await Promise.all([
      prisma.profiles.findUnique({
        where: { email: post.userEmail ?? '' },
        select: { display_name: true, avatar_url: true }
      }),
      prisma.creatorProfile.findUnique({
        where: { email: post.userEmail ?? '' },
        select: { handle: true, displayName: true, avatarUrl: true }
      })
    ])

    return NextResponse.json({
      stream: {
        id: post.id,
        status: post.liveEndedAt ? 'ENDED' : 'ACTIVE',
        ivsPlaybackUrl: post.ivsPlaybackUrl,
        creatorEmail: post.userEmail,
        displayName: profile?.display_name || creator?.displayName || post.userEmail?.split('@')[0],
        handle: creator?.handle || post.userEmail?.split('@')[0],
        avatarUrl: profile?.avatar_url || creator?.avatarUrl || null,
        caption: post.caption,
      }
    })
  }

  // Fall back to Mux stream
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
