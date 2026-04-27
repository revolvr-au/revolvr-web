import { NextRequest, NextResponse } from 'next/server'
import Mux from '@mux/mux-node'
import { prisma } from '@/lib/prisma'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('mux-signature') ?? ''

  // Verify it's actually from Mux
  try {
    mux.webhooks.verifySignature(body, req.headers, process.env.MUX_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(body)
  const type: string = event.type
  const data = event.data

  switch (type) {

    case 'video.live_stream.active': {
      // Stream is live — flip status, surface in feed
      const dbStream = await prisma.muxLiveStream.findUnique({
        where: { muxLiveStreamId: data.id }
      })
      if (!dbStream) break

      await prisma.muxLiveStream.update({
        where: { id: dbStream.id },
        data: { status: 'ACTIVE', liveStartedAt: new Date() }
      })

      // Update the feed post + boost voltage
      await prisma.post.updateMany({
        where: { liveStreamId: dbStream.id },
        data: { voltage: 500 }
      })

      // Fire voltage event
      await prisma.creatorVoltageEvent.create({
        data: {
          creatorEmail: dbStream.creatorEmail,
          eventType: 'LIVE_STARTED',
          points: 500,
          targetType: 'LIVE_SESSION',
          targetId: dbStream.id,
          dedupeKey: `live_started_${dbStream.id}`,
        }
      })
      break
    }

    case 'video.live_stream.idle': {
      // Stream went idle/ended
      const dbStream = await prisma.muxLiveStream.findUnique({
        where: { muxLiveStreamId: data.id }
      })
      if (!dbStream) break

      await prisma.muxLiveStream.update({
        where: { id: dbStream.id },
        data: { status: 'ENDED', liveEndedAt: new Date() }
      })

      // Drop voltage back — stream is over
      await prisma.post.updateMany({
        where: { liveStreamId: dbStream.id },
        data: { voltage: 50 }
      })
      break
    }

    case 'video.asset.ready': {
      // Recording is ready — attach VOD playback ID to the post
      const passthrough = data.passthrough as string | undefined
      if (!passthrough) break

      const vodPlaybackId = data.playback_ids?.[0]?.id
      if (!vodPlaybackId) break

      // passthrough will be the liveStreamId we'll set in create route
      await prisma.post.updateMany({
        where: { liveStreamId: passthrough },
        data: {
          muxPlaybackId: vodPlaybackId,
          postType: 'FEED',
          liveEndedAt: new Date(),
        }
      })
      break
    }

    default:
      // Ignore all other Mux events
      break
  }

  return NextResponse.json({ received: true })
}