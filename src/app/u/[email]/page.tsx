import { prisma } from "@/lib/prisma";

type PageProps = {
  params: {
    email: string;
  };
};

export default async function UserProfilePage({ params }: PageProps) {
  const decodedEmail = decodeURIComponent(params.email).toLowerCase();

  const creator = await prisma.creatorProfile.findUnique({
    where: { email: decodedEmail },
  });

  const posts = await prisma.post.findMany({
    where: { userEmail: decodedEmail },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          {creator?.displayName || creator?.handle || decodedEmail}
        </h1>
        <p className="text-sm text-white/60">{decodedEmail}</p>

        {creator && (
          <div className="mt-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
            Creator status:{" "}
            {creator.verificationStatus
              ? creator.verificationStatus.toUpperCase()
              : "STANDARD"}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {posts.length === 0 && (
          <div className="text-sm text-white/50">
            No posts yet.
          </div>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
          >
            {post.mediaUrl && (
              <img
                src={post.mediaUrl}
                alt=""
                className="w-full object-cover"
              />
            )}
            {post.caption && (
              <div className="p-4 text-sm">{post.caption}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
