import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import VerificationCTA from "@/components/VerificationCTA";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ email: string }>;
};

function formatDateTime(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export default async function UserProfilePage({ params }: PageProps) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();

  // Primary identity in this app is creatorProfile (Prisma "user" model is not present)
  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
  });

  // Show posts if they exist (fields confirmed by your TypeScript error)
  const posts = await prisma.post.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
    take: 24,
  });

  if (!creator && posts.length === 0) {
    notFound();
  }

  const title =
    creator?.displayName ||
    creator?.handle ||
    email.split("@")[0] ||
    "User";

  const status =
    creator?.verificationStatus === "gold"
      ? "GOLD"
      : creator?.verificationStatus === "blue"
        ? "BLUE"
        : creator
          ? "CREATOR"
          : "USER";

  // Optional: if your creatorProfile has a renewal/end field, wire it here.
  // We intentionally keep this defensive to avoid schema mismatch compile errors.
  const renewal: Date | null = (creator as any)?.verificationRenewsAt
    ? new Date((creator as any).verificationRenewsAt)
    : (creator as any)?.verificationRenews
      ? new Date((creator as any).verificationRenews)
      : (creator as any)?.verifiedUntil
        ? new Date((creator as any).verifiedUntil)
        : (creator as any)?.verificationCurrentPeriodEnd
          ? new Date((creator as any).verificationCurrentPeriodEnd)
          : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-white/60">{email}</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
          <div className="text-sm text-white/60">Creator status</div>
          <div className="mt-1 text-lg font-semibold">{status}</div>
        </div>

        {renewal && (
          <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
            <div className="text-sm text-white/60">Verification renews</div>
            <div className="mt-1 text-lg font-semibold">
              {formatDateTime(renewal)}
            </div>
          </div>
        )}
      </div>
        <div className="mt-6 space-y-4">
  ...
  <VerificationCTA />
</div>

      {posts.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
            >
              {post.imageUrl && post.mediaType?.startsWith("image") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full object-cover"
                />
              )}
              {post.caption && (
                <div className="p-4 text-sm text-white/90">{post.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
