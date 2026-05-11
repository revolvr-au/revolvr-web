import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { IVSClient, CreateChannelCommand } from "@aws-sdk/client-ivs";

export async function POST(req: Request) {
  try {
    const ivsClient = new IVSClient({
      region: process.env.AWS_REGION ?? "ap-northeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

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

    const channelName = `revolvr-${user.email!.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}-${Date.now()}`;

    const channel = await ivsClient.send(new CreateChannelCommand({
      name: channelName,
      latencyMode: "LOW",
      type: "STANDARD",
      tags: { creator: user.email!, platform: "revolvr" },
    }));

    const streamKey = channel.streamKey?.value;
    const playbackUrl = channel.channel?.playbackUrl;
    const ingestEndpoint = channel.channel?.ingestEndpoint;
    const channelArn = channel.channel?.arn;

    if (!streamKey || !playbackUrl || !ingestEndpoint || !channelArn) {
      throw new Error("IVS channel creation failed — missing credentials");
    }

    const post = await prisma.post.create({
      data: {
        userEmail: user.email!,
        imageUrl: "",
        caption: `${displayName} is live`,
        postType: "LIVE",
        liveStartedAt: new Date(),
        voltage: 100,
        ivsPlaybackUrl: playbackUrl,
        liveStreamId: channelArn,
      },
    });

    return NextResponse.json({
      streamId: post.id,
      streamKey,
      playbackUrl,
      ingestEndpoint,
      channelArn,
    });

  } catch (err: any) {
    console.error("create-ivs error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}