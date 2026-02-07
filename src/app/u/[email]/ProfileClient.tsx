// src/app/u/[email]/ProfileClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CreatorProfile = {
  email: string;
  displayName: string;
  handle?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;

  // For future
  isVerified?: boolean | null;
  verificationTier?: "blue" | "gold" | null;

  stats?: {
    posts?: number;
    followers?: number;
    following?: number;
  };
};

type Post = {
  id: string;
  imageUrl?: string | null;
  mediaType?: "image" | "video";
  createdAt?: string;
};

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function handleFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  return (localPart || "user").toLowerCase();
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center px-3">
      <div className="text-white/90 text-[15px] font-semibold leading-none">{value}</div>
      <div className="text-white/45 text-[11px] mt-1">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 h-10 rounded-xl text-[12px] font-semibold",
        "border transition-all duration-150",
        active
          ? "bg-white/10 border-white/15 text-white"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/7",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function ProfileClient({ email }: { email: string }) {
  const safeEmail = String(email || "").trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "media" | "about">("posts");

  const fallbackProfile = useMemo<CreatorProfile>(() => {
    return {
      email: safeEmail,
      displayName: displayNameFromEmail(safeEmail),
      handle: handleFromEmail(safeEmail),
      avatarUrl: null,
      bio: null,
      isVerified: null,
      verificationTier: null,
      stats: { posts: 0, followers: 0, following: 0 },
    };
  }, [safeEmail]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);

        // 1) Try to fetch a creator profile endpoint (if/when you add it)
        // Recommended shape:
        // GET /api/creator/profile?email=... -> { email, displayName, handle, avatarUrl, bio, verificationTier, stats }
        let nextProfile: CreatorProfile | null = null;

        try {
          const res = await fetch(`/api/creator/profile?email=${encodeURIComponent(safeEmail)}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const j = (await res.json().catch(() => null)) as any;
            if (j && typeof j === "object") {
              nextProfile = {
                email: safeEmail,
                displayName: String(j.displayName || j.name || displayNameFromEmail(safeEmail)),
                handle: j.handle ? String(j.handle) : handleFromEmail(safeEmail),
                avatarUrl: isValidImageUrl(j.avatarUrl ?? j.avatar_url) ? String(j.avatarUrl ?? j.avatar_url) : null,
                bio: j.bio ? String(j.bio) : null,
                verificationTier: (j.verificationTier ?? null) as any,
                isVerified: Boolean(j.isVerified ?? j.verified ?? false) || j.verificationTier === "blue" || j.verificationTier === "gold",
                stats: {
                  posts: Number(j.stats?.posts ?? 0),
                  followers: Number(j.stats?.followers ?? 0),
                  following: Number(j.stats?.following ?? 0),
                },
              };
            }
          }
        } catch {
          // ignore - endpoint may not exist yet
        }

        // 2) Try to fetch posts for this user (optional; safe fallback if not implemented)
        // Recommended:
        // GET /api/posts?email=... -> { posts: [...] } or [...]
        let nextPosts: Post[] = [];
        try {
          const res = await fetch(`/api/posts?email=${encodeURIComponent(safeEmail)}`, { cache: "no-store" });
          if (res.ok) {
            const j = (await res.json().catch(() => null)) as any;
            const rows = Array.isArray(j) ? j : Array.isArray(j?.posts) ? j.posts : [];
            nextPosts = rows
              .map((x: any) => ({
                id: String(x.id ?? ""),
                imageUrl: isValidImageUrl(x.imageUrl) ? String(x.imageUrl) : null,
                mediaType: x.mediaType === "video" ? "video" : "image",
                createdAt: x.createdAt ? String(x.createdAt) : undefined,
              }))
              .filter((p: Post) => p.id);
          }
        } catch {
          // ignore - endpoint may not support filtering yet
        }

        if (cancelled) return;

        // If no endpoint yet, use a clean fallback
        setProfile(nextProfile ?? fallbackProfile);

        // If we did not get stats from API, infer posts count from returned posts
        if (!nextProfile?.stats?.posts) {
          setProfile((prev) =>
            prev
              ? { ...prev, stats: { ...(prev.stats ?? {}), posts: nextPosts.length || 0 } }
              : fallbackProfile
          );
        }

        setPosts(nextPosts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [safeEmail, fallbackProfile]);

  const p = profile ?? fallbackProfile;
  const avatarUrl = isValidImageUrl(p.avatarUrl) ? p.avatarUrl : null;

  return (
    <div className="min-h-screen px-4 pb-24">
      {/* Top bar */}
      <div className="pt-8">
        <div className="flex items-center justify-between">
          <Link href="/public-feed" className="text-white/65 hover:text-white text-sm">
            ← Back
          </Link>

          <div className="text-white/85 text-sm font-semibold truncate max-w-[70%]">
            @{p.handle ?? handleFromEmail(p.email)}
          </div>

          <button
            type="button"
            className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white/70 text-xs hover:bg-white/10"
            aria-label="Profile menu"
            title="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="rv-avatar relative h-20 w-20 rounded-full overflow-hidden bg-white/5">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full grid place-items-center text-white/70 font-semibold">
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Verified (optional) */}
              {p.verificationTier ? (
                <div
                  className={[
                    "absolute -right-2 -top-2 z-20",
                    "h-[18px] w-[18px] rounded-full grid place-items-center",
                    "text-[10px] font-bold text-black shadow ring-2 ring-black/30",
                    p.verificationTier === "gold" ? "bg-amber-400" : "bg-blue-500",
                  ].join(" ")}
                  title={p.verificationTier === "gold" ? "Gold tick" : "Blue tick"}
                  aria-label={p.verificationTier === "gold" ? "Gold tick" : "Blue tick"}
                >
                  ✓
                </div>
              ) : null}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="text-white/95 text-xl font-semibold leading-tight truncate">
                {p.displayName}
              </div>
              <div className="text-white/50 text-sm truncate">{p.email}</div>

              {p.bio ? (
                <div className="mt-2 text-white/75 text-[13px] leading-snug">
                  {p.bio}
                </div>
              ) : (
                <div className="mt-2 text-white/45 text-[13px] leading-snug">
                  {/* keep it elegant until bios exist */}
                  Professional creator profile.
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-black/10 py-3">
            <div className="flex-1 flex justify-center">
              <Stat label="Posts" value={p.stats?.posts ?? 0} />
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 flex justify-center">
              <Stat label="Followers" value={p.stats?.followers ?? 0} />
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 flex justify-center">
              <Stat label="Following" value={p.stats?.following ?? 0} />
            </div>
          </div>

          {/* CTAs */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 h-11 rounded-xl bg-white text-black font-semibold text-sm hover:opacity-95"
            >
              Follow
            </button>
            <button
              type="button"
              className="flex-1 h-11 rounded-xl border border-white/12 bg-white/6 text-white/90 font-semibold text-sm hover:bg-white/10"
            >
              Message
            </button>
            <button
              type="button"
              className="h-11 px-4 rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-emerald-100 font-semibold text-sm hover:bg-emerald-500/20"
              title="Tip / React"
            >
              ✨
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <TabButton active={tab === "posts"} onClick={() => setTab("posts")}>
              Posts
            </TabButton>
            <TabButton active={tab === "media"} onClick={() => setTab("media")}>
              Media
            </TabButton>
            <TabButton active={tab === "about"} onClick={() => setTab("about")}>
              About
            </TabButton>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-5">
        {loading ? (
          <div className="text-sm text-white/60">Loading profile…</div>
        ) : tab === "about" ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-white/85 font-semibold">About</div>
            <div className="mt-2 text-white/60 text-sm leading-relaxed">
              This is where we’ll place the professional identity layer (bio, links, categories, location, offerings).
              No Instagram copy — Revolvr’s “creator card”.
            </div>
          </div>
        ) : (
          <>
            {!posts.length ? (
              <div className="text-white/60 text-sm">No posts yet.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5"
                    title={post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                  >
                    {post.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-white/35 text-xs">
                        media
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
