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
  const cookieStore = await cookies()
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {}
      },
    },
  }
)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get display name from profiles table — works for any user
  const profile = await prisma.profiles.findUnique({
    where: { email: user.email! },
    select: { display_name: true }
  })

  const displayName = profile?.display_name ?? user.email!.split('@')[0]

  // One live stream at a time
  const existing = await prisma.muxLiveStream.findFirst({
    where: { creatorEmail: user.email!, status: 'ACTIVE' }
  })
  if (existing) {
    return NextResponse.json({
      error: 'You already have an active stream',
      streamId: existing.id,
      playbackId: existing.muxPlaybackId,
    }, { status: 409 })
  }

  // Store DB record first so we have the ID for passthrough
  const dbStream = await prisma.muxLiveStream.create({
    data: {
      muxLiveStreamId: 'pending',
      muxStreamKey: 'pending',
      muxPlaybackId: 'pending',
      status: 'IDLE',
      creatorEmail: user.email!,
    }
  })

  // Create Mux live stream with passthrough set from the start
  const liveStream = await mux.video.liveStreams.create({
    playback_policy: ['public'],
    latency_mode: 'low',
    reconnect_window: 60,
    passthrough: dbStream.id,
    new_asset_settings: {
      playback_policy: ['public'],
      mp4_support: 'capped-1080p',
    },
  })

  const streamKey = liveStream.stream_key!
  const playbackId = liveStream.playback_ids?.[0]?.id!
  const muxLiveStreamId = liveStream.id!

  // Update DB record with real Mux IDs
  await prisma.muxLiveStream.update({
    where: { id: dbStream.id },
    data: {
      muxLiveStreamId,
      muxStreamKey: streamKey,
      muxPlaybackId: playbackId,
    }
  })

  // Create feed post immediately
  await prisma.post.create({
    data: {
      userEmail: user.email!,
      imageUrl: '',
      caption: `${displayName} is live`,
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