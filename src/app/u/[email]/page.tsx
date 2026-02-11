import Link from "next/link";
import { notFound } from "next/navigation";

import FeedLayout from "@/components/FeedLayout";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = {
  params: { email: string };
};

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

export default async function Page({ params }: PageProps) {
  const raw = String(params?.email ?? "");
  const email = safeDecode(raw).trim().toLowerCase();

  if (!email || !email.includes("@")) notFound();

  // Pull creator/user (best-effort, depending on your schema)
  const creator =
    (await (prisma as any).creator?.findUnique?.({
      where: { email },
      select: {
        email: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
        isVerified: true,
        verificationTier: true,
        bio: true,
      },
    }).catch(() => null)) ?? null;

  // Pull posts for this email (best-effort)
  const posts =
    (await (prisma as any).post?.findMany?.({
      where: { userEmail: email },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        caption: true,
        createdAt: true,
        imageUrl: true,
        media: true, // if your schema has it
        userEmail: true,
      },
    }).catch(() => [])) ?? [];

  const displayName = String(creator?.displayName || displayNameFromEmail(email));
  const handle =
    creator?.handle
      ? String(creator.handle).startsWith("@")
        ? String(creator.handle)
        : `@${creator.handle}`
      : `@${String(email).split("@")[0]}`;

  const avatarUrl =
    creator?.avatarUrl && String(creator.avatarUrl).trim() ? String(creator.avatarUrl).trim() : null;

  const isVerified = Boolean(creator?.isVerified) || creator?.verificationTier === "blue" || creator?.verificationTier === "gold";

  return (
    <FeedLayout title={displayName} subtitle={handle}>
      <div className="space-y-5 pb-12">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center text-sm font-semibold text-emerald-300 uppercase">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              (displayName || "r")[0].toUpperCase()
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{displayName}</h1>
              {isVerified ? (
                <span
                  title="Verified creator"
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px]"
                  aria-label="Verified"
                >
                  ✓
                </span>
              ) : null}
            </div>

            <div className="text-sm text-white/50 break-all">{email}</div>

            {creator?.bio ? (
              <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{String(creator.bio)}</p>
            ) : (
              <p className="mt-2 text-sm text-white/60">Profile page coming online.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="text-sm font-medium">Posts</span>
            <Link href="/public-feed" className="text-xs text-white/60 hover:text-white underline">
              Back to feed
            </Link>
          </div>

          {!posts.length ? (
            <div className="px-4 py-5 text-sm text-white/60">No posts yet.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {posts.map((p: any) => (
                <div key={p.id} className="px-4 py-4 space-y-2">
                  <div className="text-[11px] text-white/40">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
                  </div>

                  {p.imageUrl ? (
                    <div className="rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={String(p.imageUrl)} alt="" className="w-full h-auto" />
                    </div>
                  ) : null}

                  {p.caption ? <p className="text-sm text-white/90">{String(p.caption)}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FeedLayout>
  );
}
