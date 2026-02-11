"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type ProfilePost = {
  id: string;
  caption?: string | null;
  createdAt?: string | null;
  imageUrl?: string | null;
  media?: { type: "image" | "video"; url: string; order?: number | null }[] | null;
};

type Profile = {
  email: string;
  displayName?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified?: boolean | null;
  verificationTier?: "blue" | "gold" | null;
  counts?: { posts?: number; followers?: number; following?: number } | null;
};

function safeInitial(s: string) {
  return (s || "U").trim().slice(0, 1).toUpperCase();
}

const VerifiedBadge = () => (
  <span
    title="Verified creator"
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] ml-1"
    aria-label="Verified"
  >
    ✓
  </span>
);

export default function ProfileClient(props: {
  profile: Profile;
  posts: ProfilePost[];
  viewerEmail?: string | null;
  backHref?: string;
}) {
  const { profile, posts, viewerEmail, backHref = "/public-feed" } = props;
  const router = useRouter();

  const [tab, setTab] = useState<"posts" | "media" | "about">("posts");

  const handle = useMemo(() => {
    const h = (profile.handle || "").trim();
    if (!h) return `@${profile.email.split("@")[0]}`;
    return h.startsWith("@") ? h : `@${h}`;
  }, [profile.handle, profile.email]);

  const displayName = useMemo(() => {
    const d = (profile.displayName || "").trim();
    return d || profile.email.split("@")[0];
  }, [profile.displayName, profile.email]);

  const isVerified =
    Boolean(profile.isVerified) || profile.verificationTier === "blue" || profile.verificationTier === "gold";

  const counts = profile.counts ?? {};
  const postsCount = counts.posts ?? posts.length ?? 0;
  const followersCount = counts.followers ?? 0;
  const followingCount = counts.following ?? 0;

  const firstImageFor = (p: ProfilePost) => {
    const media = (p.media || [])
      .slice()
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
    const m0 = media.find((m) => m?.url);
    return m0?.url || p.imageUrl || null;
  };

  return (
    <main className="mx-auto max-w-screen-lg px-4 sm:px-6 py-6 text-white">
      {/* Top bar (back + hamburger) */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
            aria-label="Menu"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Profile header card */}
      <section className="rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-black/30 overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-semibold">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            ) : (
              safeInitial(displayName)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold truncate">{displayName}</h1>
              {isVerified ? <VerifiedBadge /> : null}
            </div>
            <div className="text-sm text-white/60 truncate">{handle}</div>
            <div className="text-[12px] text-white/35 break-all">{profile.email}</div>

            <p className="mt-3 text-sm text-white/70">
              {profile.bio?.trim()
                ? profile.bio
                : "Profile bio goes here (REVOLVR-style). Keep it clean, premium, and high-signal."}
            </p>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-white text-black hover:bg-white/90 transition"
              >
                {viewerEmail && viewerEmail.toLowerCase() === profile.email.toLowerCase() ? "Edit" : "Follow"}
              </button>

              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-white/10 border border-white/10 text-white hover:bg-white/15 transition"
              >
                Message
              </button>

              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-white/10 border border-white/10 text-white hover:bg-white/15 transition"
              >
                Subscribe
              </button>
            </div>
          </div>

          {/* Counts */}
          <div className="w-full sm:w-auto sm:min-w-[280px] grid grid-cols-3 gap-3 text-center">
            <div className="py-2">
              <div className="text-xl font-semibold">{postsCount}</div>
              <div className="text-[11px] text-white/40 tracking-wide">POSTS</div>
            </div>
            <div className="py-2 border-x border-white/10">
              <div className="text-xl font-semibold">{followersCount}</div>
              <div className="text-[11px] text-white/40 tracking-wide">FOLLOWERS</div>
            </div>
            <div className="py-2">
              <div className="text-xl font-semibold">{followingCount}</div>
              <div className="text-[11px] text-white/40 tracking-wide">FOLLOWING</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-white/10">
          <div className="grid grid-cols-3 text-sm">
            <button
              type="button"
              onClick={() => setTab("posts")}
              className={[
                "py-3 transition",
                tab === "posts" ? "bg-white/5 text-white" : "text-white/60 hover:text-white",
              ].join(" ")}
            >
              Posts
            </button>
            <button
              type="button"
              onClick={() => setTab("media")}
              className={[
                "py-3 transition border-x border-white/10",
                tab === "media" ? "bg-white/5 text-white" : "text-white/60 hover:text-white",
              ].join(" ")}
            >
              Media
            </button>
            <button
              type="button"
              onClick={() => setTab("about")}
              className={[
                "py-3 transition",
                tab === "about" ? "bg-white/5 text-white" : "text-white/60 hover:text-white",
              ].join(" ")}
            >
              About
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5 sm:p-6">
          {tab === "about" ? (
            <div className="text-sm text-white/70 space-y-2">
              <div className="text-white/80 font-semibold">About</div>
              <div>{profile.bio?.trim() ? profile.bio : "No bio yet."}</div>
            </div>
          ) : tab === "media" ? (
            <div className="text-sm text-white/60">
              Media view coming next — we’ll filter posts to images/videos only.
            </div>
          ) : !posts?.length ? (
            <div className="text-sm text-white/60">No posts yet.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {posts.map((p) => {
                const img = firstImageFor(p);
                return (
                  <Link
                    key={p.id}
                    href={`/posts/${encodeURIComponent(p.id)}`}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:bg-white/10 transition block"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[11px] text-white/40">
                        No media
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
