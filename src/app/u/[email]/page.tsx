import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function safeDecodeEmail(raw: string) {
  try {
    // Next may pass it already-decoded, but decodeURIComponent is safe here.
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return String(raw || "").trim().toLowerCase();
  }
}

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

export default async function ProfilePage({
  params,
}: {
  params: { email: string };
}) {
  const email = safeDecodeEmail(params.email);
  if (!email || !email.includes("@")) notFound();

  // IMPORTANT: use findFirst unless email is @unique in Prisma
  const creator =
    (await prisma.creator.findFirst({
      where: { email },
      select: {
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        isVerified: true,
      },
    })) ?? null;

  const posts = await prisma.post.findMany({
    where: { userEmail: email },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true,
      imageUrl: true,
      mediaType: true,
      createdAt: true,
      caption: true,
    },
  });

  const name = creator?.displayName || displayNameFromEmail(email);
  const handle = creator?.handle ? `@${creator.handle}` : null;

  return (
    <div className="min-h-screen px-4 pt-6 pb-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-xl font-semibold text-white/70">
              {creator?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatarUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                (name || "r")[0].toUpperCase()
              )}
            </div>

            <div className="pt-1">
              <div className="text-2xl font-semibold text-white/95 leading-tight">
                {name}
                {creator?.isVerified ? (
                  <span
                    title="Verified"
                    className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white text-[11px] align-middle"
                  >
                    ✓
                  </span>
                ) : null}
              </div>

              <div className="text-sm text-white/55 mt-1">
                {handle ? <span className="mr-2">{handle}</span> : null}
                <span className="opacity-80">{email}</span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Link
                  href="/public-feed"
                  className="text-xs text-white/60 hover:text-white underline"
                >
                  Back to feed
                </Link>

                {/* Placeholder buttons for the next phase */}
                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                >
                  Follow
                </button>
                <button
                  type="button"
                  className="text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                >
                  Message
                </button>
              </div>
            </div>
          </div>

          {/* Hamburger placement (we’ll wire data later) */}
          <button
            type="button"
            aria-label="Menu"
            className="h-10 w-10 rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 inline-flex items-center justify-center"
          >
            ☰
          </button>
        </div>

        {/* Stats row (stubs for now) */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Posts", value: posts.length },
            { label: "Followers", value: "—" },
            { label: "Following", value: "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center"
            >
              <div className="text-lg font-semibold text-white/90">
                {s.value}
              </div>
              <div className="text-xs text-white/45 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {posts.length ? (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/public-feed#${p.id}`}
                className="block aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20"
                title={p.caption || ""}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </Link>
            ))
          ) : (
            <div className="col-span-3 text-sm text-white/60 rounded-2xl bg-white/5 border border-white/10 p-6">
              No posts yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
