import { prisma } from "@/lib/prisma";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email).toLowerCase();

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

        <div className="mt-4 grid gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
            <div className="text-white/70">Creator status</div>
            <div className="mt-1 font-semibold">
              {creator
                ? creator.verificationStatus
                  ? String(creator.verificationStatus).toUpperCase()
                  : "STANDARD"
                : "NOT A CREATOR"}
            </div>
          </div>

          {creator?.verificationCurrentPeriodEnd && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
              <div className="text-white/70">Verification renews</div>
              <div className="mt-1 font-semibold">
                {new Date(creator.verificationCurrentPeriodEnd).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {posts.length === 0 && (
          <div className="text-sm text-white/50">No posts yet.</div>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
          >
            {post.imageUrl && (
              <img src={post.imageUrl} alt="" className="w-full object-cover" />
            )}
            {post.caption && <div className="p-4 text-sm">{post.caption}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
