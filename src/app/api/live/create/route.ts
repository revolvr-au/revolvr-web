import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Mux from '@mux/mux-node'
import { prisma } from '@/lib/prisma'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.creatorProfile.findUnique({
    where: { email: user.email! },
    select: { email: true, displayName: true, ringTier: true }
  })

  if (!profile) {
    return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 })
  }

  // Check for existing active stream — one live at a time
  const existing = await prisma.muxLiveStream.findFirst({
    where: { creatorEmail: user.email!, status: 'ACTIVE' }
  })
  if (existing) {
    return NextResponse.json({
      error: 'You already have an active stream',
      playbackId: existing.muxPlaybackId,
    }, { status: 409 })
  }

  // Create Mux live stream
const liveStream = await mux.video.liveStreams.create({
  playback_policy: ['public'],
  latency_mode: 'low',
  reconnect_window: 60,
  new_asset_settings: {
    playback_policy: ['public'],
    mp4_support: 'capped-1080p',
  },
})

const streamKey = liveStream.stream_key!
const playbackId = liveStream.playback_ids?.[0]?.id!
const muxLiveStreamId = liveStream.id!

// Store in DB
const dbStream = await prisma.muxLiveStream.create({
  data: {
    muxLiveStreamId,
    muxStreamKey: streamKey,
    muxPlaybackId: playbackId,
    status: 'IDLE',
    creatorEmail: user.email!,
  }
})

// Update Mux stream with passthrough so VOD links back on recording.ready
await mux.video.liveStreams.update(muxLiveStreamId, {
  new_asset_settings: { passthrough: dbStream.id }
} as any)

  // Create the feed Post immediately so it's ready when stream goes active
  await prisma.post.create({
    data: {
      userEmail: user.email!,
      imageUrl: '',
      caption: `${profile.displayName} is live`,
      postType: 'LIVE',
      muxPlaybackId: playbackId,
      liveStreamId: dbStream.id,
      liveStartedAt: new Date(),
      voltage: 100,
    }
  })

  return NextResponse.json({
    streamKey,
    playbackId,
    rtmpUrl: 'rtmps://global-live.mux.com:443/app',
    streamId: dbStream.id,
  })
}