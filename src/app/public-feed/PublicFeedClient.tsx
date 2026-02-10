// src/app/public-feed/PublicFeedClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import { MediaCarousel } from "@/components/media/MediaCarousel";

const mockPeople: PersonRailItem[] = [
  { email: "singaporeair@revolvr.net", tick: "gold", isLive: true },
  { email: "mangusta@yachts.com", tick: "blue", isLive: false },
  { email: "feadship@revolvr.net", tick: null, isLive: true },
];

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string;
  createdAt: string;

  mediaType?: "image" | "video";
  media?: { type: "image" | "video"; url: string; order?: number }[];

  creator?: {
    displayName?: string | null;
    handle?: string | null;
    avatarUrl?: string | null;
    isVerified?: boolean | null;
  } | null;
};

type PostsResponseShape = { posts?: unknown };
type ErrorResponseShape = { error?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasPostsArray(v: unknown): v is PostsResponseShape {
  return isRecord(v) && "posts" in v;
}

function hasErrorMessage(v: unknown): v is ErrorResponseShape {
  return isRecord(v) && "error" in v;
}

function normalizePosts(rows: unknown): Post[] {
  if (!Array.isArray(rows)) return [];
  return rows as Post[];
}

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
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

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Follow system state
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

  // TEMP (until auth wiring)
  const viewerEmail = "test@revolvr.net";

  // Load posts
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/posts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const msg =
            hasErrorMessage(json) && typeof (json as ErrorResponseShape).error === "string"
              ? String((json as ErrorResponseShape).error)
              : `Failed to load posts (${res.status})`;

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const rows = Array.isArray(json)
          ? json
          : hasPostsArray(json)
            ? (json as PostsResponseShape).posts ?? []
            : [];

        if (!cancelled) setPosts(normalizePosts(rows));
      } catch (e: unknown) {
        console.error("[public-feed] load posts error", e);
        if (!cancelled) {
          setErr("Failed to load public feed.");
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // People rail items
  const railItems: PersonRailItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);

      out.push({
        email,
        imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
        displayName: displayNameFromEmail(email),
        tick: (p as any).verificationTier ?? null,
      });

      if (out.length >= 20) break;
    }

    return out;
  }, [posts]);

  // Load follow statuses
  useEffect(() => {
    if (!posts.length) return;

    let cancelled = false;

    async function loadFollowStatus() {
      const results: Record<string, boolean> = {};

      await Promise.all(
        posts.map(async (post) => {
          const target = String(post.userEmail || "").trim().toLowerCase();
          if (!target || target === viewerEmail) return;

          try {
            const res = await fetch(
              `/api/follow/status?viewer=${encodeURIComponent(viewerEmail)}&target=${encodeURIComponent(target)}`,
              { cache: "no-store" }
            );

            const json = await res.json().catch(() => null);
            results[target] = Boolean(json?.following);
          } catch {
            results[target] = false;
          }
        })
      );

      if (!cancelled) setFollowMap(results);
    }

    loadFollowStatus();

    return () => {
      cancelled = true;
    };
  }, [posts]);

  async function toggleFollow(targetEmail: string) {
    const target = String(targetEmail || "").trim().toLowerCase();
    if (!target.includes("@")) return;
    if (target === viewerEmail) return;

    const currentlyFollowing = Boolean(followMap[target]);

    setFollowLoading((prev) => ({ ...prev, [target]: true }));

    // optimistic update
    setFollowMap((prev) => ({
      ...prev,
      [target]: !currentlyFollowing,
    }));

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewerEmail,
          targetEmail: target,
          action: currentlyFollowing ? "unfollow" : "follow",
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || json?.ok !== true) {
        // rollback if failed
        setFollowMap((prev) => ({
          ...prev,
          [target]: currentlyFollowing,
        }));
      }
    } catch (e) {
      console.error("[follow] toggle failed", e);

      // rollback
      setFollowMap((prev) => ({
        ...prev,
        [target]: currentlyFollowing,
      }));
    } finally {
      setFollowLoading((prev) => ({ ...prev, [target]: false }));
    }
  }

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <div className="space-y-6">
        <PeopleRail items={railItems.length ? railItems : mockPeople} size={72} />

        {loading ? (
          <div className="text-sm text-white/70">Loading public feed…</div>
        ) : err ? (
          <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
            {err}
          </div>
        ) : !posts.length ? (
          <div className="text-sm text-white/70">No posts yet.</div>
        ) : (
          <div className="space-y-6 pb-12">
            {posts.map((post) => {
              const email = String(post.userEmail || "").trim().toLowerCase();
              const tick = (post as any).verificationTier ?? null;
              const creator = (post as any).creator ?? null;

              const displayName = String(creator?.displayName || displayNameFromEmail(email));

              const avatarUrl =
                (((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url) &&
                  String(((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url)).trim())
                  ? String(((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url)).trim()
                  : null;

              const isVerified = !!creator?.isVerified || tick === "blue" || tick === "gold";

              const isFollowing = Boolean(followMap[email]);
              const isBusy = Boolean(followLoading[email]);

              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          (email || "r")[0].toUpperCase()
                        )}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-[240px] inline-flex items-center">
                          {displayName}
                          {isVerified ? <VerifiedBadge /> : null}
                        </span>

                        <span className="text-[11px] text-white/40">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {email !== viewerEmail ? (
                        <button
                          disabled={isBusy}
                          onClick={() => toggleFollow(email)}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold transition",
                            isFollowing
                              ? "bg-white/10 text-white hover:bg-white/15"
                              : "bg-blue-500 text-white hover:bg-blue-400",
                            isBusy ? "opacity-50 cursor-not-allowed" : "",
                          ].join(" ")}
                        >
                          {isBusy ? "..." : isFollowing ? "Following" : "Follow"}
                        </button>
                      ) : null}

                      <Link
                        href={`/u/${encodeURIComponent(email)}`}
                        className="text-xs text-white/60 hover:text-white underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>

                  {/* Media */}
                  <div className="relative w-full">
                    <MediaCarousel
                      className="w-full"
                      media={
                        (post as any).media?.length
                          ? (post as any).media
                              .slice()
                              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                              .map((m: any) => ({
                                type: m.type === "video" ? "video" : "image",
                                url: m.url,
                              }))
                          : post.imageUrl
                            ? [
                                {
                                  type: post.mediaType === "video" ? "video" : "image",
                                  url: post.imageUrl,
                                },
                              ]
                            : []
                      }
                    />
                  </div>

                  {/* Caption */}
                  {post.caption ? (
                    <p className="px-4 py-3 text-sm text-white/90">{post.caption}</p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}
