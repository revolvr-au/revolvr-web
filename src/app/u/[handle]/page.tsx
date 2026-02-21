import { prisma } from "@/lib/prisma";
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

  console.log("Profile route hit with handle:", handle);

  if (!handle) {
    return <div style={{ padding: 40 }}>Handle missing</div>;
  }

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

  const [followersCount, followingCount] = await Promise.all([
    prisma.follow.count({
      where: { followingEmail: creator.email },
    }),
    prisma.follow.count({
      where: { followerEmail: creator.email },
    }),
  ]);

  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <main className="max-w-3xl mx-auto px-4 py-6">
        <ProfileClient
          profile={{
            email: creator.email,
            displayName:
              creator.displayName ?? creator.handle ?? creator.email,
            handle: creator.handle ?? "",
            avatarUrl: creator.avatarUrl,
            bio: creator.bio,
            followersCount,
            followingCount,
            isVerified: creator.isVerified ?? false,
          }}
          posts={posts}
        />
      </main>
    </div>
  );
}