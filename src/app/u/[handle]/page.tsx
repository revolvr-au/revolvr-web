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

  // Handle lookup: CreatorProfile.handle only — profiles has no handle column
  const creator = await prisma.creatorProfile.findFirst({
    where: {
      handle: {
        equals: handle,
        mode: "insensitive",
      },
    },
    select: {
      email: true,
      displayName: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      isVerified: true,
    },
  });

  if (!creator) {
    return (
      <div style={{ padding: 40, color: "white" }}>
        Creator not found. Handle: {handle}
      </div>
    );
  }

  // Fetch profiles row for supplementary display data (falls back to CreatorProfile fields if null)
  const profileRow = await prisma.profiles.findFirst({
    where: { email: creator.email },
    select: { display_name: true, avatar_url: true, bio: true },
  });

  const isCreator = true;

  const mergedDisplayName =
    profileRow?.display_name ?? creator.displayName ?? creator.handle ?? creator.email;
  const mergedAvatarUrl = profileRow?.avatar_url ?? creator.avatarUrl ?? null;
  const mergedBio = profileRow?.bio ?? creator.bio ?? null;

  const posts = await prisma.post.findMany({
    where: { userEmail: creator.email },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      caption: true,
      createdAt: true,
    },
    take: 60,
  });

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

  console.log("AUTH USER:", user?.id, user?.email, "SESSION:", user ? "valid" : "null");

  const [followersCount, followingCount, followRecord, commentsCount] = await Promise.all([
    prisma.follow.count({
      where: { followingEmail: creator.email },
    }),
    prisma.follow.count({
      where: { followerEmail: creator.email },
    }),
    currentUserEmail
      ? prisma.follow.findFirst({
          where: { followerEmail: currentUserEmail, followingEmail: creator.email },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.comment.count({
      where: { post: { userEmail: creator.email } },
    }),
  ]);

  const isFollowing = !!followRecord;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0806" }}>
      <ProfileClient
        profile={{
          email: creator.email,
          displayName: mergedDisplayName,
          handle: creator.handle ?? "",
          avatarUrl: mergedAvatarUrl,
          bio: mergedBio,
          followersCount,
          followingCount,
          isVerified: creator.isVerified ?? false,
        }}
        posts={posts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        isFollowing={isFollowing}
        isCreator={isCreator}
        commentsCount={commentsCount}
      />
    </div>
  );
}
