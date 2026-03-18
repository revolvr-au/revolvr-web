"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift, Send, MoreVertical, Plus, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGoLive } from "@/hooks/useGoLive";



type ApiPost = {
  id: string;
  userEmail: string | null;
  imageUrl: string | null;
  caption: string | null;
  comments?: any[];
  reactions?: any[];
};

type RewardMode = "applause" | "fire" | "love" | "respect";



export function PublicFeedClient() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [railUsers, setRailUsers] = useState<any[]>([])
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPost, setMenuPost] = useState<ApiPost | null>(null);

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

const lastTapRef = useRef(0);

function handlePostTap(e: React.PointerEvent) {
  const target = e.target as HTMLElement;

  if (target.closest("button, input, textarea")) return;

  const now = Date.now();

  if (now - lastTapRef.current < 300) {
    console.log("DOUBLE TAP FIRED");
  }

  lastTapRef.current = now;
}

  const viewer = "test@revolvr.net";
  const router = useRouter();

  const TOP_BAR = 72;
  const PEOPLE_RAIL = 130;
  

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

useEffect(() => {
  function logClick(e: MouseEvent) {
    console.log("CLICK TARGET:", e.target);
  }

  document.addEventListener("click", logClick);

  return () => {
    document.removeEventListener("click", logClick);
  };
}, []);
 useEffect(() => {
  observerRef.current = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const postId = entry.target.getAttribute("data-postid");
        if (!postId) return;

        const post = posts.find((p) => p.id === postId);
        if (post?.userEmail) {
          setActivePost(post.userEmail);
        }
      });
    },
    { threshold: 0.6 }
  );

  return () => observerRef.current?.disconnect();
}, []);

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

      const res = await fetch("/api/public-feed", { cache: "no-store" });
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

    const creators = Array.from(
  new Map(
    incoming
      .filter(p => p.userEmail)
      .map(p => [
        p.userEmail,
        {
  id: p.userEmail,
  avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${p.userEmail}`,
  live: false
}
      ])
  ).values()
)
console.log("Rail creators:", creators)
setRailUsers(creators)

      const nextCommentCounts: Record<string, number> = {};
      const nextLiked: Record<string, boolean> = {};
      const nextCounts: Record<string, number> = {};

      for (const p of incoming) {
        nextCommentCounts[p.id] = p.comments?.length ?? 0;
        nextLiked[p.id] = false;
        nextCounts[p.id] = p.reactions?.length ?? 0;
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

  } catch (err) {
    console.error(err);
  }
}

function jumpToCreator(creatorId: string) {
  const container = feedRef.current;
  if (!container) return;

  const post = container.querySelector(
    `[data-user="${creatorId}"]`
  ) as HTMLElement | null;

  if (!post) return;

  post.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
return (
  <FeedLayout
    title="Revolvr"
    onGoLive={goLive}
    activePost={activePost}
    railUsers={railUsers}
    onSelectCreator={jumpToCreator}
  >

    {loading && <div className="p-4 opacity-70 text-white">Loading…</div>}
    {err && <div className="p-4 text-red-400">{err}</div>}

    {!loading && (
      <>
        <div className="feed-center">
          <div className="feed-phone flex flex-col">

            <div
              ref={feedRef}
              className="feed-scroll flex-1 overflow-y-auto"
              style={{ overscrollBehavior: "none" }}
            >
              {posts.map((p) => {
                const email = String(p.userEmail || "").trim().toLowerCase();
                const display = email ? displayNameFromEmail(email) : "User";

                return (
                  <div
                  key={p.id}
                  data-postid={p.id}
                  onPointerDown={handlePostTap}
                    data-user={email}
                    ref={(el) => {
                      if (!el || !observerRef.current) return;
                      observerRef.current.observe(el);
                    }}
                    className="feed-post relative w-full overflow-hidden bg-black"
                    style={{
                    height: "100vh",
                    background: "rgba(0,255,0,0.2)" // 🟢 GREEN
                    }}
                  >
                    {p.imageUrl && (
                      <img
                        src={p.imageUrl}
                        alt={p.caption || "post"}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    <div
                      style={{
                        position: "absolute",
                        right: 12,
                        bottom:"calc(90px + env(safe-area-inset-bottom))",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 14,
                        zIndex: 60,
                        color: "white"
                      }}
                    >
                      <button onClick={() => toggleLike(p.id)}>
                        <Heart size={28} color={likedMap[p.id] ? "red" : "white"} />
                        <div style={{ fontSize: 12 }}>{likeCounts[p.id] || 0}</div>
                      </button>

                      <button onClick={() => openComments(p.id)}>
                        <MessageCircle size={28} />
                        <div style={{ fontSize: 12 }}>{commentCounts[p.id] || 0}</div>
                      </button>

                      <button onClick={() => sharePost(p.id)}>
                        <Share2 size={28} />
                      </button>

                      <button onClick={() => toggleRewards(p.id)}>
                        <Gift size={28} />
                      </button>

                      <div style={{ height: 12 }} />

                      <button>
                        <Plus size={28} />
                      </button>

                      <button>
                        <Home size={28} />
                      </button>

                      <button
                        onClick={() => {
                          setMenuPost(p);
                          setMenuOpen(true);
                        }}
                      >
                        <MoreVertical size={28} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* COMMENTS MODAL */}
        {commentsOpen && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              onClick={closeComments}
            />
          </div>
        )}

        {/* MENU MODAL */}
        {menuOpen && menuPost && (
          <div className="fixed inset-0 z-50">
            <button
              className="absolute inset-0 bg-black/60"
              onClick={() => setMenuOpen(false)}
            />

            <div className="absolute bottom-0 w-full bg-zinc-900 rounded-t-2xl p-6 pb-10 text-white"
     style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}>
              <div style={{ marginBottom: 12, fontWeight: 600 }}>
                @{displayNameFromEmail(menuPost.userEmail || "")}
              </div>

              {menuPost.caption && (
                <div style={{ opacity: 0.8, marginBottom: 20 }}>
                  {menuPost.caption}
                </div>
              )}

             <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

  <button
    onClick={() => sharePost(menuPost.id)}
    className="text-base font-medium tracking-tight"
  >
    Share
  </button>

  <button
    className="text-base font-medium tracking-tight"
  >
    Save
  </button>

  <button
    className="text-base font-medium tracking-tight"
    style={{ color: "#ff6b6b" }}
  >
    Report
  </button>

</div>
            </div>
          </div>
        )}

      </>
    )}

  </FeedLayout>
);
}