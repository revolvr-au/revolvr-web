import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profiles.findUnique({
      where: { email: user.email! },
      select: { display_name: true }
    });
    const displayName = profile?.display_name ?? user.email!.split("@")[0];

    const post = await prisma.post.create({
  data: {
    userEmail: user.email!,
    imageUrl: "",
    caption: `${displayName} is live`,
    postType: "LIVE",
    liveStartedAt: new Date(),
    voltage: 100,
    ivsPlaybackUrl: process.env.IVS_PLAYBACK_URL ?? null,  // ← this line
  },
});

    return NextResponse.json({
      streamId: post.id,
      playbackUrl: process.env.IVS_PLAYBACK_URL,
    });
  } catch (err: any) {
    console.error("create-ivs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
