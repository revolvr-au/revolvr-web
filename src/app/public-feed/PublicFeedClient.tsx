"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift, Send, MoreVertical, Plus, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGoLive } from "@/hooks/useGoLive";
import { createPortal } from "react-dom";



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
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  

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
  const [heartBursts, setHeartBursts] = useState<
  { id: string; postId: string }[]
>([]);

const lastTapRef = useRef(0);

function handlePostTap(e: React.PointerEvent, postId: string) {
  const target = e.target as HTMLElement;

  if (target.closest("button, a, input, textarea")) return;

  const now = Date.now();

  if (now - lastTapRef.current < 300) {
    toggleLike(postId);

    triggerHeartBurst(postId); // 👈 NEW
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

  return () => {
    observerRef.current?.disconnect();
  };
}, [posts]);

const [vh, setVh] = useState(0);

useEffect(() => {
  const update = () => setVh(window.innerHeight);
  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
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
function triggerHeartBurst(postId: string) {
  const id = `${Date.now()}-${Math.random()}`;

  setHeartBursts((prev) => [...prev, { id, postId }]);

  setTimeout(() => {
    setHeartBursts((prev) => prev.filter((h) => h.id !== id));
  }, 700);
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
      setMenuOpen(false); 
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
function handleTranche(comment: any) {
  console.log("TRANCHE:", comment);
}

function handleReply(comment: any) {
  setReplyToCommentId(comment.id); // 👈 THIS IS KEY
  setCommentText(`@${displayNameFromEmail(comment.userEmail)} `);
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
  alert(txt); // 👈 ADD THIS
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
        replyToCommentId,
      }),
    });

    const data = await res.json();

    console.log("NEW COMMENT:", data.comment);

    if (!res.ok || !data?.ok) return;

    setComments((prev) => [...prev, data.comment]);
    setCommentText("");

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
    {/* FEED */}
    <div
      ref={feedRef}
      className="h-screen w-full overflow-y-scroll snap-y snap-mandatory"
    >
      {posts.map((p) => {
        const email = String(p.userEmail || "").toLowerCase();
        const mediaUrl = String(p.imageUrl || "").trim();

        return (
          <div
            key={p.id}
            data-postid={p.id}
            data-user={email}
            className="relative h-screen w-full snap-start overflow-hidden"
            onPointerUp={(e) => handlePostTap(e, p.id)}
          >
            {/* IMAGE */}
            {mediaUrl && (
              <img
                src={mediaUrl}
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-auto"
                alt=""
              />
            )}

            {/* RIGHT RAIL */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-[100]">

              {/* AVATAR */}
              <button
                onClick={() => router.push(`/user/${email}`)}
                className="mb-3"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  <img
                    src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${email}`}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
              </button>

              
              {/* LIKE */}
          
<div className="relative flex flex-col items-center">

  {/* BURST HEARTS */}
  {heartBursts
    .filter((h) => h.postId === p.id)
    .map((h) => (
      <span
        key={h.id}
        className="absolute text-white text-lg animate-burst"
        style={{
          bottom: "36px",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        ❤️
      </span>
    ))}

  {/* BUTTON */}
  <button
    onClick={() => toggleLike(p.id)}
    className="flex flex-col items-center"
  >
    <Heart size={28} color={likedMap[p.id] ? "red" : "white"} />
    <span className="text-xs text-white">
      {likeCounts[p.id] || 0}
    </span>
  </button>

</div>
          

  {/* COMMENTS */}
{commentsOpen && (
  <>
    {/* BACKDROP */}
    <div
      className="fixed inset-0 bg-black/50 z-[9998]"
      onClick={closeComments}
    />

    {/* SHEET */}
    <div className="fixed inset-0 z-[9999] flex items-end justify-center">
      <div className="w-full max-w-[720px] max-h-[70vh] bg-black rounded-t-2xl flex flex-col overflow-hidden">

        {/* SCROLL AREA */}
        <div className="flex-1 overflow-y-auto p-4">

          {(() => {
            const parentComments = comments.filter(c => c.replyToCommentId == null);
            const replies = comments.filter(c => c.replyToCommentId != null);

            return parentComments.map((c) => {
              const childReplies = replies.filter(r => r.replyToCommentId === c.id);

              return (
                <div key={c.id} className="mb-4">

                  {/* MAIN COMMENT */}
                  <div className="flex items-start gap-3">

                    <img
                      src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${c.userEmail}`}
                      className="w-9 h-9 rounded-full object-cover"
                    />

                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">
                        {displayNameFromEmail(c.userEmail)}
                      </div>

                      <div className="text-sm text-white/80 break-words">
                        {c.body}
                      </div>

                      <div className="text-xs text-white/40 mt-1 flex gap-3">
                        <button onClick={() => handleReply(c)}>Reply</button>
                        <button onClick={() => handleTranche(c)}>Tranche</button>
                      </div>
                    </div>

                  </div>

                  {/* REPLIES */}
                  {childReplies.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 mt-3 ml-10">

                      <img
                        src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${r.userEmail}`}
                        className="w-7 h-7 rounded-full object-cover"
                      />

                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {displayNameFromEmail(r.userEmail)}
                        </div>

                        <div className="text-sm text-white/70 break-words">
                          {r.body}
                        </div>
                      </div>

                    </div>
                  ))}

                </div>
              );
            });
          })()}

        </div>

        {/* INPUT BAR */}
        <div className="p-3 border-t border-white/10 flex items-center gap-2">

          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-white outline-none"
          />

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSendComment();
            }}
            className="text-white p-2"
          >
            <Send size={18} />
          </button>

        </div>

      </div>
    </div>
  </>
)}

    {/* MENU */}
    {menuOpen && menuPost && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMenuOpen(false)}
            />

            <div className="relative bg-zinc-900 p-4 rounded-2xl text-white">
              <button onClick={() => sharePost(menuPost.id)}>
                Share
              </button>

              <button
                onClick={() => setMenuOpen(false)}
                className="block mt-2 text-sm opacity-70"
              >
                Cancel
              </button>
            </div>
          </div>,
          document.body
        )
       : null}

  </>
)}
</FeedLayout>
);
}