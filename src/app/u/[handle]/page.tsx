import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: rawHandle } = await params;

  const handle = decodeURIComponent(rawHandle || "").trim();

  if (!handle) {
    return <div style={{ padding: 40 }}>Handle missing</div>;
  }

  // First try CreatorProfile by handle
  const creator = await prisma.creatorProfile.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
    select: {
      email: true,
      displayName: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      isVerified: true,
      status: true,
      voltage: true,
      ringTier: true,
      ringExpiresAt: true,
    },
  });

  // If not found, try deriving handle from email in profiles table
  // handle = email.split("@")[0] lowercased
  let profileRow: { email: string; display_name: string | null; avatar_url: string | null; bio: string | null } | null = null;
  if (!creator) {
    profileRow = await prisma.profiles.findFirst({
      where: { email: { contains: `${handle}@` } },
      select: { email: true, display_name: true, avatar_url: true, bio: true },
    });
    if (!profileRow) {
      return <div>Creator not found. Handle: {handle}</div>;
    }
  } else {
    // Fetch profiles row for the creator so we can apply correct display priority
    profileRow = await prisma.profiles.findFirst({
      where: { email: creator.email },
      select: { email: true, display_name: true, avatar_url: true, bio: true },
    });
  }

  const email = creator?.email ?? profileRow?.email ?? "";
  const displayName = profileRow?.display_name?.trim() || creator?.displayName?.trim() || handle;
  const avatarUrl = profileRow?.avatar_url ?? creator?.avatarUrl ?? null;
  const bio = profileRow?.bio ?? creator?.bio ?? null;
  const isCreator = !!creator;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email ?? null;

  const [posts, recentVoltageEvents, followRecord] = await Promise.all([
    prisma.post.findMany({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        imageUrl: true,
        caption: true,
        createdAt: true,
      },
      take: 60,
    }),
    creator
      ? prisma.creatorVoltageEvent.findMany({
          where: { creatorEmail: email },
          orderBy: { createdAt: "desc" },
          select: { points: true },
          take: 5,
        })
      : Promise.resolve([]),
    currentUserEmail
      ? prisma.follow.findFirst({
          where: { followerEmail: currentUserEmail, followingEmail: email },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const isFollowing = !!followRecord;
  const totalVoltage = creator?.voltage ?? 0;
  const recentVoltage = recentVoltageEvents.reduce((sum, event) => sum + (event.points || 0), 0);
  const postCount = posts.length;
  const now = new Date();
  const ringTier = creator?.ringExpiresAt && creator.ringExpiresAt < now
    ? "NONE"
    : (creator?.ringTier as string | undefined) ?? "NONE";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0806" }}>
      <ProfileClient
        profile={{
          email,
          displayName,
          handle: creator?.handle ?? handle,
          avatarUrl,
          bio,
          isVerified: creator?.isVerified ?? false,
          totalVoltage,
          recentVoltage,
          postCount,
          ringTier,
        }}
        posts={posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        isFollowing={isFollowing}
        isCreator={isCreator}
      />
    </div>
  );
}
