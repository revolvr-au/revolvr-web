import { prisma } from "@/lib/prisma";

export async function buildFeedSnapshot(viewerEmail: string) {

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      media: true,
      reactions: true,
      comments: { take: 2 }
    }
  });

  const snapshots = posts.map((post) => ({
    viewerEmail,
    postId: post.id,
    rankScore: Date.now() - new Date(post.createdAt).getTime(),
    payload: {
      post,
    }
  }));

  await prisma.feedSnapshot.deleteMany({
    where: { viewerEmail }
  });

  await prisma.feedSnapshot.createMany({
    data: snapshots
  });

  return snapshots.map((s) => s.payload.post);
}