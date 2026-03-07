"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { PersonRailItem } from "@/components/PeopleRail";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGoLive } from "@/hooks/useGoLive";

type ApiPost = {
  id: string;
  userEmail: string | null;
  imageUrl: string | null;
  caption: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
};

type RewardMode = "applause" | "fire" | "love" | "respect";

export function PublicFeedClient() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardPostId, setRewardPostId] = useState<string | null>(null);

  const [activePost, setActivePost] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollLock = useRef(false);

  const viewer = "test@revolvr.net";
  const router = useRouter();

  const TOP_BAR = 72;
  const PEOPLE_RAIL = 110;
  const BOTTOM_BAR = 80;

  const rewardItems: Array<{ mode: RewardMode; label: string; icon: string }> = [
    { mode: "applause", label: "Applause", icon: "👏" },
    { mode: "fire", label: "Fire", icon: "🔥" },
    { mode: "love", label: "Love", icon: "❤️" },
    { mode: "respect", label: "Respect", icon: "🫡" },
  ];

  const safeUUID = () => {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && crypto?.randomUUID) return crypto.randomUUID();
    } catch {}
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const isIOS =
    typeof navigator !== "undefined" && /iPad|iPhone|iPod/i.test(navigator.userAgent);

  const goLive = useGoLive(() => {
    const sessionId = safeUUID();
    const url = `/live/${encodeURIComponent(sessionId)}?role=host`;

    if (isIOS) {
      window.location.assign(url);
      return;
    }

    router.push(url);
  });

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

  function observePost(el: HTMLDivElement | null) {
    if (!el) return;

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const postId = entry.target.getAttribute("data-postid");
              if (postId) setActivePost(postId);
            }
          });
        },
        { threshold: 0.6 }
      );
    }

    observerRef.current.observe(el);
  }

  useEffect(() => {
    if (!commentsOpen) return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [commentsOpen]);

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
              : `Failed to load posts (${res.status})`;

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const incoming: ApiPost[] = Array.isArray(json?.posts) ? json.posts : [];
        if (cancelled) return;

        setPosts(incoming);

        const nextCommentCounts: Record<string, number> = {};
        const nextLiked: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};

        for (const p of incoming) {
          nextCommentCounts[p.id] = 0;
          nextLiked[p.id] = Boolean(p.likedByCurrentUser);
          nextCounts[p.id] = Number.isFinite(p.likeCount) ? p.likeCount : 0;
        }

        setCommentCounts(nextCommentCounts);
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

  useEffect(() => {
    if (!commentsOpen) return;

    const initialHeight = window.innerHeight;

    const handleResize = () => {
      document.documentElement.style.setProperty("--locked-vh", `${initialHeight}px`);
    };

    window.addEventListener("resize", handleResize);
    document.documentElement.style.setProperty("--locked-vh", `${initialHeight}px`);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.documentElement.style.removeProperty("--locked-vh");
    };
  }, [commentsOpen]);

  useEffect(() => {
    if (!commentsOpen || !activePostId) return;

    async function loadComments() {
      try {
        const res = await fetch(
          `/api/comments?postId=${encodeURIComponent(activePostId)}`
        );
        const data = await res.json();

        if (res.ok && Array.isArray(data?.comments)) {
          setComments(data.comments);
          setCommentCounts((prev) => ({
            ...prev,
            [activePostId]: data.comments.length,
          }));
        }
      } catch (err) {
        console.error("Failed loading comments", err);
      }
    }

    loadComments();
  }, [commentsOpen, activePostId]);

  useEffect(() => {
    const container = feedRef.current;
    if (!container || posts.length === 0) return;

    const items = Array.from(
      container.querySelectorAll("[data-postid]")
    ) as HTMLElement[];

    function snapToClosest() {
      if (scrollLock.current) return;

      const containerTop = container.scrollTop;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;

      items.forEach((item) => {
        const dist = Math.abs(item.offsetTop - containerTop);
        if (dist < closestDist) {
          closestDist = dist;
          closest = item;
        }
      });

      if (!closest) return;

      scrollLock.current = true;
      container.scrollTo({
        top: closest.offsetTop,
        behavior: "smooth",
      });

      window.setTimeout(() => {
        scrollLock.current = false;
      }, 250);
    }

    let scrollTimer: number | undefined;

    function onScroll() {
      if (scrollTimer) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(snapToClosest, 80);
    }

    container.addEventListener("scroll", onScroll);

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollTimer) window.clearTimeout(scrollTimer);
    };
  }, [posts]);

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

  function toggleRewards(postId: string) {
    setRewardPostId(postId);
    setRewardOpen((prev) => {
      if (rewardPostId && rewardPostId !== postId) return true;
      return !prev;
    });
  }

  function closeRewards() {
    setRewardOpen(false);
    setRewardPostId(null);
  }

  async function onOpenReward(mode: RewardMode, postId: string) {
    try {
      const post = posts.find((x) => x.id === postId);
      const creatorEmail = String(post?.userEmail || "").trim().toLowerCase();

      if (!creatorEmail) {
        alert("Creator not found for this post.");
        return;
      }

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reaction",
          creatorEmail,
          userEmail: viewer,
          source: "FEED",
          targetId: postId,
          returnPath: "/public-feed",
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[public-feed] reward checkout failed", txt);
        alert("Checkout failed. Try again.");
        return;
      }

      const data = await res.json().catch(() => null);

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      alert("Stripe did not return a checkout URL.");
    } catch (err) {
      console.error("[public-feed] reward error", err);
      alert("Could not start checkout.");
    } finally {
      closeRewards();
    }
  }

  async function handleSendComment() {
    if (!activePostId || !commentText.trim()) return;

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: activePostId,
          userEmail: viewer,
          body: commentText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) return;

      setComments((prev) => [...prev, data.comment]);
      setCommentText("");
      setCommentCounts((prev) => ({
        ...prev,
        [activePostId]: (prev[activePostId] || 0) + 1,
      }));

      if (typeof document !== "undefined") {
        const el = document.activeElement as HTMLElement | null;
        el?.blur();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed" onGoLive={goLive}>
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

      {!loading && !err && posts.length > 0 && (
          <div
          ref={feedRef}
          style={{
          height: `calc(100vh - ${TOP_BAR + PEOPLE_RAIL + BOTTOM_BAR}px)`
          }}
          className="overflow-y-auto overflow-x-hidden snap-y snap-mandatory touch-pan-y"
          >
          
          {posts.map((p) => {
            const email = String(p.userEmail || "").trim().toLowerCase();
            const display = email ? displayNameFromEmail(email) : "User";

            const mediaUrl = String(p.imageUrl || "").trim();
            const lower = mediaUrl.toLowerCase();
            const isVideo =
              lower.endsWith(".mov") ||
              lower.endsWith(".mp4") ||
              lower.endsWith(".webm");

            const rewardsOpenForThisPost = rewardOpen && rewardPostId === p.id;
            const isActive = activePost === p.id;

            return (
              <div
                key={p.id}
                data-postid={p.id}
                ref={observePost}
                style={{
                minHeight: `calc(100vh - ${TOP_BAR + PEOPLE_RAIL + BOTTOM_BAR}px)`
                }}
                className="snap-center flex flex-col justify-center pt-4 -mx-4 md:mx-0"
                >
                <div className="relative w-full md:max-w-[640px] md:mx-auto aspect-[9/16] overflow-hidden bg-black">
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-30" />

                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-40">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => router.push(`/u/${email}`)}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20">
                        <img
                          src={p.imageUrl || "/avatar-placeholder.png"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white drop-shadow-md">
                          {display}
                        </div>
                        <div className="text-xs text-white/80 drop-shadow-md">
                          @{email.split("@")[0]}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFollow(email)}
                      className={`rounded-full px-3 py-1 text-xs transition active:scale-95 ${
                        followMap[email]
                          ? "bg-white text-black"
                          : "bg-white/15 backdrop-blur text-white hover:bg-white/25"
                      }`}
                    >
                      {followMap[email] ? "Following" : "Follow"}
                    </button>
                  </div>

                  {mediaUrl ? (
                    isVideo ? (
                      <video
                        src={mediaUrl}
                        controls
                        playsInline
                        muted={!isActive}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="p-6 text-sm opacity-70 text-white">
                      No media.
                    </div>
                  )}

                  <div className="absolute z-40 left-4 bottom-[90px] md:bottom-6">
                    <button
                      type="button"
                      onClick={() => toggleRewards(p.id)}
                      className="flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-2 text-xs text-white shadow-lg hover:bg-black/80 transition"
                    >
                      <Gift size={16} />
                      Rewards
                    </button>

                    {rewardsOpenForThisPost && (
                      <div className="mt-2 w-56 rounded-2xl border border-white/10 bg-black/55 backdrop-blur p-2 shadow-lg shadow-black/40">
                        <div className="text-[11px] text-white/60 px-2 pb-2">
                          Reward this post
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {rewardItems.map((it) => (
                            <button
                              key={it.mode}
                              type="button"
                              onClick={() => onOpenReward(it.mode, p.id)}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition active:scale-[0.99]"
                            >
                              <div className="text-base">{it.icon}</div>
                              <div className="text-xs text-white/90 font-semibold">
                                {it.label}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="absolute z-40 right-4 bottom-[105px] md:bottom-6 flex flex-col items-center gap-5">
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

                    <button
                      type="button"
                      onClick={() => openComments(p.id)}
                      className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition"
                    >
                      <MessageCircle size={26} />
                      <span className="text-[12px]">
                        {commentCounts[p.id] ?? 0}
                      </span>
                    </button>

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
                  <div className="px-4 mt-3 text-sm text-white/90">
                    {p.caption}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {commentsOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={closeComments}
          />

          <div className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-5xl rounded-t-3xl border border-white/10 bg-[#0b0f1a] shadow-2xl flex flex-col h-[75vh] max-h-[75vh]">
            <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-white/15" />

            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-sm font-semibold text-white">Comments</div>
              <button
                type="button"
                onClick={closeComments}
                className="rounded-full px-3 py-1 text-sm text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <div className="space-y-4">
                {comments.length === 0 && (
                  <div className="text-sm text-white/40">No comments yet.</div>
                )}

                {comments.map((c) => (
                  <div key={c.id}>
                    <div className="text-xs text-white/50">
                      @{c.userEmail?.split("@")[0] || "user"}
                    </div>
                    <div className="text-sm text-white/90">{c.body}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && commentText.trim()) {
                      e.preventDefault();
                      await handleSendComment();
                    }
                  }}
                  placeholder="Add a comment…"
                  className="h-11 flex-1 rounded-full bg-white/5 px-4 text-base text-white outline-none"
                />

                <button
                  type="button"
                  disabled={!commentText.trim()}
                  onClick={handleSendComment}
                  className={`h-11 w-11 flex items-center justify-center rounded-full transition ${
                    commentText.trim()
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FeedLayout>
  );
}