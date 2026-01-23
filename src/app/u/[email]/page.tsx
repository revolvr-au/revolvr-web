import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ email: string }>;
};

function formatMonthYear(d: Date) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function safePickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail).toLowerCase();

  // Primary identity source (creatorProfile may or may not exist)
  const creator = await prisma.creatorProfile.findUnique({
    where: { email },
  });

  // Posts (safe fields only)
  const posts = await prisma.post.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // If totally unknown and no posts, 404
  if (!creator && posts.length === 0) notFound();

  const displayName =
    creator?.displayName ||
    creator?.handle ||
    email.split("@")[0] ||
    "User";

  const handle = creator?.handle ? `@${creator.handle}` : null;

  const verification =
    creator?.verificationStatus === "gold"
      ? "gold"
      : creator?.verificationStatus === "blue"
        ? "blue"
        : null;

  const accountType = creator ? "Creator" : "User";

  const avatarUrl =
    safePickString(creator as any, ["avatarUrl", "imageUrl", "profileImageUrl"]) ||
    null;

  const bio =
    safePickString(creator as any, ["bio", "about", "description"]) || null;

  const memberSinceBase: Date | null =
    (creator as any)?.createdAt
      ? new Date((creator as any).createdAt)
      : posts[posts.length - 1]?.createdAt
        ? new Date(posts[posts.length - 1].createdAt)
        : null;

  const trustLine = [
    verification === "gold"
      ? "Verified Business"
      : verification === "blue"
        ? "Verified Individual"
        : null,
    accountType,
    memberSinceBase ? `Member since ${formatMonthYear(memberSinceBase)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href="/feed" className="text-sm text-white/70 hover:text-white">
          ← Back to feed
        </a>
        <div className="text-sm text-white/60">Profile</div>
        <div className="w-[92px]" />
      </div>

      {/* Header */}
      <div className="mt-8 flex items-start gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-lg font-semibold text-white/70">
              {displayName?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold truncate">{displayName}</h1>

            {verification === "gold" && (
              <span
                title="Verified business"
                className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-200 border border-yellow-300/20"
              >
                ✓ GOLD
              </span>
            )}

            {verification === "blue" && (
              <span
                title="Verified individual"
                className="inline-flex items-center gap-1 rounded-full bg-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-300/20"
              >
                ✓ BLUE
              </span>
            )}
          </div>

          <div className="mt-1 text-sm text-white/60">
            {handle ? <span className="mr-2">{handle}</span> : null}
            <span className="truncate">{email}</span>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      {trustLine ? (
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-sm text-white/75">
          {trustLine}
        </div>
      ) : null}

      {/* Bio */}
      {bio ? (
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
          <div className="text-sm text-white/90 whitespace-pre-wrap">{bio}</div>
        </div>
      ) : null}

      {/* Content */}
      <div className="mt-8">
        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-10 text-center text-white/60">
            No posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {posts.map((post) => {
              const isImage = Boolean(post.mediaType?.startsWith("image"));
              const isVideo = Boolean(post.mediaType?.startsWith("video"));

              return (
                <div
                  key={post.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-white/5 border border-white/10"
                >
                  {isImage && post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/5" />
                  )}

                  {(isVideo || isImage) ? (
                    <div className="absolute left-2 top-2 rounded-full bg-black/50 backdrop-blur px-2 py-1 text-[11px] text-white/90 border border-white/10">
                      {isVideo ? "▶" : "🖼"}
                    </div>
                  ) : null}

                  {post.caption ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="h-14 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-3 pb-2">
                        <div className="text-xs text-white/90 line-clamp-1">
                          {post.caption}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
