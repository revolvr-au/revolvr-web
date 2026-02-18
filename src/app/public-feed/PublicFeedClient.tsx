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

  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardPostId, setRewardPostId] = useState<string | null>(null);


  // Temporary until auth wiring
  const viewer = "test@revolvr.net";

  const railItems = useMemo<PersonRailItem[]>(() => {
    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;

      seen.add(email);

      out.push({
        id: email,
        email,
        handle: displayNameFromEmail(email).toLowerCase().replace(/\s+/g, ""),
        imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
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

        const url = "/api/posts?userEmail=" + encodeURIComponent(viewer);
        const res = await fetch(url, { cache: "no-store" });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg =
            typeof json?.error === "string"
              ? json.error
              : "Failed to load posts (" + res.status + ")";

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const incoming: ApiPost[] = Array.isArray(json?.posts) ? json.posts : [];
        if (cancelled) return;

        setPosts(incoming);

        const nextLiked: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};

        for (const p of incoming) {
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
        [postId]: Math.max(0, (counts[postId] || 0) + (next[postId] ? 1 : -1)),
      }));

      return next;
    });
  }

  function onToggleFollow(email: string) {
    const key = email.trim().toLowerCase();
    setFollowMap((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function sharePost(postId: string) {
    try {
      const link = window.location.origin + "/post/" + postId;
      navigator.clipboard.writeText(link);
      alert("Link copied!");
    } catch {
      alert("Could not copy link.");
    }
  }

  function openComments(postId: string) {
    setActivePostId(postId);
    setCommentsOpen(true);
  }

  function closeComments() {
    setCommentsOpen(false);
    setActivePostId(null);
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

          const mediaUrl = String(p.imageUrl || "").trim();
          const lower = mediaUrl.toLowerCase();

          const isVideo =
            lower.endsWith(".mov") ||
            lower.endsWith(".mp4") ||
            lower.endsWith(".webm");

          return (
            <div key={p.id} className="p-4">
              <div className="mb-2">
                <div className="text-sm font-semibold text-white">{display}</div>
                {email && (
                  <div className="text-xs text-white/40">
                    @{email.split("@")[0]}
                  </div>
                )}
              </div>

              <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                {mediaUrl ? (
                  isVideo ? (
                    <video src={mediaUrl} controls className="w-full h-auto block" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
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
  onClick={() => alert("Reward clicked")}
  className="absolute z-30 left-4 bottom-[90px] md:bottom-6 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-2 text-xs text-white shadow-lg hover:bg-black/80 transition"
>
  <Gift size={16} />
  Rewards
</button>


                {/* RIGHT LOWER ACTIONS */}
                <div className="absolute z-30 right-4 bottom-[105px] md:bottom-6 flex flex-col items-center gap-5">
                  {/* LIKE */}
                  <button
                    type="button"
                    onClick={() => toggleLike(p.id)}
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition"
                  >
                    <Heart
                      size={26}
                      className={likedMap[p.id] ? "fill-red-500 text-red-500" : ""}
                    />
                    <span className="text-[12px]">{likeCounts[p.id] ?? 0}</span>
                  </button>

                  {/* COMMENT */}
                  <button
                    type="button"
                    onClick={() => openComments(p.id)}
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition"
                  >
                    <MessageCircle size={26} />
                    <span className="text-[12px]">0</span>
                  </button>

                  {/* SHARE */}
                  <button
                    type="button"
                    onClick={() => sharePost(p.id)}
                    className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition"
                  >
                    <Share2 size={26} />
                    <span className="text-[12px]">Share</span>
                  </button>
                </div>
              </div>

              {p.caption && (
                <div className="mt-3 text-sm text-white/90">{p.caption}</div>
              )}
            </div>
          );
        })}

      {/* COMMENTS SHEET */}
      {commentsOpen && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close comments"
            onClick={closeComments}
          />

          {/* sheet */}
          <div className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-xl rounded-t-3xl border border-white/10 bg-[#0b0f1a] shadow-2xl max-h-[50vh] overflow-hidden">
            {/* GRAB HANDLE */}
            <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-white/15" />

            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-sm font-semibold text-white">Comments</div>
              <button
                type="button"
                onClick={closeComments}
                className="rounded-full px-3 py-1 text-sm text-white/70 hover:text-white hover:bg-white/5"
              >
                Close
              </button>
            </div>

            <div className="max-h-[34vh] overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <div className="text-xs text-white/50">@captain</div>
                <div className="text-sm text-white/90">This is clean 🔥</div>
              </div>

              <div>
                <div className="text-xs text-white/50">@luna</div>
                <div className="text-sm text-white/90">Love this angle.</div>
              </div>

              <div>
                <div className="text-xs text-white/50">@revolvr</div>
                <div className="text-sm text-white/90">First comment 😉</div>
              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  placeholder="Add a comment…"
                  className="h-11 flex-1 rounded-full bg-white/5 px-4 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/10"
                />
                <button
                  type="button"
                  disabled
                  className="h-11 rounded-full bg-white/10 px-4 text-sm text-white/40"
                  title="Coming soon"
                >
                  Post
                </button>
              </div>

              {activePostId && (
                <div className="mt-2 text-[11px] text-white/30">
                  Post: {activePostId}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </FeedLayout>
  );
}
