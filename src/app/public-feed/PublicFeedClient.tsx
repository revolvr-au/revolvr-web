"use client";

import PublicFeedDock from "@/components/feed/PublicFeedDock";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import PostActionModal from "@/components/PostActionModal";
import { createCheckout, type CheckoutMode } from "@/lib/actionsClient";
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

// Rest of your functions...

export default function PublicFeedClient() {
  // All your hooks...

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/posts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          const msg = hasErrorMessage(json)
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

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <div className="space-y-6">
        <PeopleRail items={railItems.length ? railItems : mockPeople} size={72} />
        {returnBanner ? (
          <div
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              returnBanner.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                : "bg-white/5 border-white/10 text-white/70",
            ].join(" ")}
          >
            {returnBanner.type === "success"
              ? `Payment successful${returnBanner.mode ? ` (${returnBanner.mode})` : ""}.`
              : `Payment canceled${returnBanner.mode ? ` (${returnBanner.mode})` : ""}.`}
          </div>
        ) : null}

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
              const emailRaw = String(post.userEmail || "").trim().toLowerCase();
              const email = isValidEmail(emailRaw) ? emailRaw : "";
              const tick = (post as any).verificationTier ?? null;
              const creator = (post as any).creator ?? null;
              const displayName = String(creator?.displayName || displayNameFromEmail(email));
              const avatarUrl =
                (((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url) &&
                  String(((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url)).trim())
                  ? String(((creator as any)?.avatarUrl ?? (creator as any)?.avatar_url)).trim()
                  : null;
              const isVerified = !!creator?.isVerified || tick === "blue" || tick === "gold";
              const showFallback = brokenPostImages[post.id] || !isValidImageUrl(post.imageUrl);
              const showFollow = Boolean(email) && viewer.includes("@") && email !== viewer;

              return (
                <article
                  key={post.id}
                  onPointerEnter={() => setActivePostId(post.id)}
                  onPointerDown={() => setActivePostId(post.id)}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  {/* Post Content */}
                  <div className="relative w-full">
                    {/* Post Media */}
                    {showFallback ? (
                      <div className="w-full h-[320px] sm:h-[420px] bg-white/5 border-t border-white/10 flex items-center justify-center">
                        <span className="text-xs text-white/50">Media unavailable</span>
                      </div>
                    ) : (
                      <MediaCarousel
                        className="w-full"
                        media={
                          post.media?.length
                            ? post.media
                                .slice()
                                .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                                .map((m: any) => ({
                                  type: m.type === "video" ? "video" : "image",
                                  url: m.url,
                                }))
                            : post.imageUrl
                            ? [
                                {
                                  type: "image",
                                  url: post.imageUrl,
                                },
                              ]
                            : []
                        }
                      />
                    )}
                  </div>

                  {/* Action Buttons: Like, Comment, Share */}
                  <div className="absolute right-4 sm:right-3 bottom-4 flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                      aria-label="Like"
                    >
                      <span>{likedMap[post.id] ? "❤️" : "🤍"}</span>
                      <span>{likeCounts[post.id] ?? 0}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommentsOpenFor(post.id)}
                      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                      aria-label="Comments"
                    >
                      💬 <span className="hidden sm:inline">Comment</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/public-feed`;
                        navigator.clipboard?.writeText(url).catch(() => {});
                      }}
                      className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                      aria-label="Share"
                    >
                      ↗ <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>

                  {/* Reward Button */}
                  <div className="absolute left-4 bottom-4">
                    <button
                      type="button"
                      onClick={() => setActiveAction({ postId: post.id, mode: "tip" })}
                      className="rounded-xl px-3 py-2 bg-white/10 text-white text-sm font-semibold hover:bg-white/15"
                      aria-label="Reward"
                    >
                      🎁 Reward
                    </button>
                  </div>

                  {/* Post Footer */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
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

                      <div className="min-w-0 flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-[240px] inline-flex items-center">
                          {displayName}
                          {isVerified ? <VerifiedBadge /> : null}
                        </span>
                        <span className="text-[11px] text-white/40">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 relative z-20 flex items-center gap-2">
                      {showFollow ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleFollow(email);
                          }}
                          disabled={Boolean(followBusy[email])}
                          className={[
                            "rounded-full px-4 py-1 text-xs font-semibold transition select-none",
                            followMap[email]
                              ? "bg-white/10 text-white hover:bg-white/15 border border-white/15"
                              : "bg-blue-500 text-white hover:bg-blue-400",
                            followBusy[email] ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                          ].join(" ")}
                        >
                          {followBusy[email] ? "…" : followMap[email] ? "Following" : "Follow"}
                        </button>
                      ) : null}
                      {email ? (
                        <Link
                          href={`/u/${encodeURIComponent(email)}`}
                          className="text-xs text-white/60 hover:text-white underline"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          View
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}
