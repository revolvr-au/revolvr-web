"use client";

import { useEffect, useMemo, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { PersonRailItem } from "@/components/PeopleRail";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift } from "lucide-react";

type ApiPost = {
  id: string;
  userEmail: string | null;
  imageUrl: string | null;
  caption: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
};

export function PublicFeedClient() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  // Temporary until auth wiring
  const viewer = "test@revolvr.net";

  const railItems = useMemo<PersonRailItem[]>(() => {
    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;

      seen.add(email);

      const img = String(p.imageUrl || "");

      out.push({
        id: email,
        email,
        handle: displayNameFromEmail(email).toLowerCase().replace(/\s+/g, ""),
        imageUrl: isValidImageUrl(img) ? img : null,
        displayName: displayNameFromEmail(email),
        tick: null,
        isLive: false,
      });

      if (out.length >= 20) break;
    }

    return out;
  }, [posts]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/posts?userEmail=${encodeURIComponent(viewer)}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            typeof json?.error === "string"
              ? json.error
              : `Failed to load posts (${res.status})`;

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const incomingPosts: ApiPost[] = Array.isArray(json?.posts)
          ? json.posts
          : [];

        if (cancelled) return;

        setPosts(incomingPosts);

        const nextLiked: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};

        for (const p of incomingPosts) {
          nextLiked[p.id] = Boolean(p.likedByCurrentUser);
          nextCounts[p.id] = Number.isFinite(p.likeCount) ? p.likeCount : 0;
        }

        setLikedMap(nextLiked);
        setLikeCounts(nextCounts);
      } catch (e) {
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
  }, [viewer]);

  function toggleLike(postId: string) {
    setLikedMap((prev) => {
      const next = { ...prev, [postId]: !prev[postId] };

      setLikeCounts((counts) => ({
        ...counts,
        [postId]: Math.max(
          0,
          (counts[postId] || 0) + (next[postId] ? 1 : -1)
        ),
      }));

      return next;
    });

    // UI-only for now (no API call yet)
  }

  function onToggleFollow(email: string) {
    const key = email.trim().toLowerCase();
    setFollowMap((prev) => ({ ...prev, [key]: !prev[key] }));

    // UI-only for now
  }

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <div className="px-4 pt-4">
        <PeopleRail
          items={railItems}
          onToggleFollow={onToggleFollow}
          followMap={followMap}
        />
      </div>

      {loading && <div className="p-4 opacity-70">Loading…</div>}
      {err && <div className="p-4 text-red-400">{err}</div>}

      {!loading && !err && posts.length === 0 && (
        <div className="p-4 opacity-70">No posts yet.</div>
      )}

      {!loading &&
        !err &&
        posts.map((p) => {
          const email = String(p.userEmail || "").trim().toLowerCase();
          const display = email ? displayNameFromEmail(email) : "User";

          const url = String(p.imageUrl || "").trim();
          const lower = url.toLowerCase();
          const isVideo =
            lower.endsWith(".mov") ||
            lower.endsWith(".mp4") ||
            lower.endsWith(".webm");

          return (
            <div key={p.id} className="p-4">
              <div className="mb-2">
                <div className="text-sm font-semibold text-white">
                  {display}
                </div>
                {email && (
                  <div className="text-xs text-white/40">
                    @{email.split("@")[0]}
                  </div>
                )}
              </div>

              {/* MEDIA + OVERLAY */}
              <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                {/* MEDIA */}
                {url ? (
                  isVideo ? (
                    <video src={url} controls className="w-full h-auto block" />
                  ) : (
                    <img
                      src={url}
                      alt="Post media"
                      className="w-full h-auto block object-cover"
                    />
                  )
                ) : (
                  <div className="p-6 text-sm opacity-70">No media.</div>
                )}

                {/* LEFT LOWER REWARDS */}
                <button
                  type="button"
                  className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs text-white shadow hover:bg-black/70"
                >
                  <Gift size={16} />
                  Rewards
                </button>

                {/* RIGHT LOWER ACTIONS */}
                <div className="absolute right-3 bottom-3 flex flex-col items-center gap-4">
                  {/* LIKE */}
                  <button
                    type="button"
                    onClick={() => toggleLike(p.id)}
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
                  >
                    <Heart
                      size={24}
                      className={
                        likedMap[p.id] ? "fill-red-500 text-red-500" : ""
                      }
                    />
                    <span className="text-[11px]">
                      {likeCounts[p.id] ?? 0}
                    </span>
                  </button>

                  {/* COMMENT */}
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
                  >
                    <MessageCircle size={24} />
                    <span className="text-[11px]">0</span>
                  </button>

                  {/* SHARE */}
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
                  >
                    <Share2 size={24} />
                    <span className="text-[11px]">Share</span>
                  </button>
                </div>
              </div>

              {/* CAPTION */}
              {p.caption && (
                <div className="mt-3 text-sm text-white/90">{p.caption}</div>
              )}
            </div>
          );
        })}
    </FeedLayout>
  );
}
