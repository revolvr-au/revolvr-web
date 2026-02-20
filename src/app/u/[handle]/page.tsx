import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const handle = decodeURIComponent(params.handle || "").trim().toLowerCase();

  if (!handle) return notFound();

  // 1️⃣ Find creator by handle
  const creator = await prisma.creatorProfile.findUnique({
    where: { handle },
    select: {
      email: true,
      displayName: true,
      handle: true,
      avatarUrl: true,
      bio: true,
      isVerified: true,
    },
  });

  if (!creator || !creator.email) {
    return notFound();
  }

  // 2️⃣ Get posts
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

  // 3️⃣ Get follow counts
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
            displayName: creator.displayName ?? creator.handle ?? creator.email,
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