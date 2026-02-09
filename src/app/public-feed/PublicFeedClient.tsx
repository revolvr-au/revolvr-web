// src/app/public-feed/PublicFeedClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import FollowButton from "@/components/FollowButton";

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  mediaType?: "image" | "video";
  media?: { type: "image" | "video"; url: string; order?: number }[];
  caption: string;
  createdAt: string;

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

  const [brokenPostImages, setBrokenPostImages] = useState<Record<string, boolean>>({});

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

        if (!cancelled) {
          setPosts(normalizePosts(rows));
        }
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

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <div className="space-y-6">
        <PeopleRail items={railItems} size={84} revolve />

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
              const isVerified = !!creator?.isVerified || tick === "blue" || tick === "gold";

              const showFallback = brokenPostImages[post.id] || !isValidImageUrl(post.imageUrl);

              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                        {(email || "r")[0].toUpperCase()}
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
                      <FollowButton followingEmail={email} />

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
                    {showFallback ? (
                      <div className="w-full h-[320px] sm:h-[420px] bg-white/5 border-t border-white/10 flex items-center justify-center">
                        <span className="text-xs text-white/50">Media unavailable</span>
                      </div>
                    ) : (
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
                    )}
                  </div>

                  {/* Social Actions */}
                  <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-5 text-sm text-white/70">
                      <button
                        type="button"
                        className="hover:text-white transition"
                        onClick={() => {
                          // TODO: implement Like toggle
                          console.log("like post", post.id);
                        }}
                      >
                        ❤️ Like
                      </button>

                      <button
                        type="button"
                        className="hover:text-white transition"
                        onClick={() => {
                          // TODO: open comments UI
                          console.log("comment post", post.id);
                        }}
                      >
                        💬 Comment
                      </button>
                    </div>

                    <span className="text-xs text-white/40"></span>
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
