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

  const { streamId } = await req.json()
  if (!streamId) {
    return NextResponse.json({ error: 'streamId required' }, { status: 400 })
  }

  const dbStream = await prisma.muxLiveStream.findUnique({
    where: { id: streamId }
  })

  if (!dbStream) {
    return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
  }

  // Only the owner can end their stream
  if (dbStream.creatorEmail !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Tell Mux to disable the stream
  await mux.video.liveStreams.disable(dbStream.muxLiveStreamId)

  // Update DB — webhook will also fire idle but this makes UI instant
  await prisma.muxLiveStream.update({
    where: { id: streamId },
    data: { status: 'ENDED', liveEndedAt: new Date() }
  })

  return NextResponse.json({ success: true })
}