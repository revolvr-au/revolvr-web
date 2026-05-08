import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { streamId } = await req.json()
  if (!streamId) return NextResponse.json({ error: 'streamId required' }, { status: 400 })

  // Handle IVS post-based stream
  const post = await prisma.post.findUnique({
    where: { id: streamId },
    select: { id: true, userEmail: true, postType: true }
  })

  if (post && post.postType === 'LIVE') {
    if (post.userEmail !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await prisma.post.update({
      where: { id: streamId },
      data: {
        liveEndedAt: new Date(),
        isLive: false,        // ← critical: marks it as no longer live
      }
    })
    return NextResponse.json({ success: true })
  }

  // Handle Mux stream
  const dbStream = await prisma.muxLiveStream.findUnique({
    where: { id: streamId }
  })
  if (!dbStream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
  if (dbStream.creatorEmail !== user.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.muxLiveStream.update({
    where: { id: streamId },
    data: { status: 'ENDED', liveEndedAt: new Date() }
  })

  return NextResponse.json({ success: true })
}