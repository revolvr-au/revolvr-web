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
  const [hearts, setHearts] = useState<
  { id: string; x: number; y: number }[]
>([]);
const [bigHeartPost, setBigHeartPost] = useState<string | null>(null);

const lastTapRef = useRef(0);

function handlePostTap(e: React.PointerEvent, postId: string) {
  const target = e.target as HTMLElement;

  if (target.closest("button, input, textarea")) return;

  const now = Date.now();

  if (now - lastTapRef.current < 300) {
  toggleLike(postId);

  // 💥 BIG HEART BURST
  setBigHeartPost(postId);
setTimeout(() => setBigHeartPost(null), 900);

  // ❤️ spawn avatar heart
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top - 20;

  const id = `${Date.now()}-${Math.random()}`;

  setTimeout(() => {
  setHearts((prev) => [...prev, { id, x, y }]);
}, 120);

  setTimeout(() => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, 3000);
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
    {/* FEED */}
    <div
      ref={feedRef}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
    >
      {posts.map((p) => {
        const email = String(p.userEmail || "").toLowerCase();
        const mediaUrl = String(p.imageUrl || "").trim();

        return (
          <div
            key={p.id}
            data-postid={p.id}
            data-user={email}
            onPointerDown={(e) => handlePostTap(e, p.id)}
            ref={(el) => {
              if (!el || !observerRef.current) return;
              observerRef.current.observe(el);
            }}
            className="relative h-screen w-full snap-start"
          >
            {/* IMAGE */}
            {mediaUrl && (
              <img
                src={mediaUrl}
                className="absolute inset-0 w-full h-full object-cover"
                alt=""
              />
            )}

            
            {/* AVATAR */}
{!menuOpen && (
  <div className="absolute top-4 right-4 z-40">
    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
      <img
        src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${email}`}
        className="w-10 h-10 rounded-full border-2 border-white"
        alt=""
      />
    </div>
  </div>
)}

            {/* GRADIENT */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent z-20" />

           {/* RIGHT ACTION BAR */}
{!menuOpen && (
  <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-40">
    
    <button onClick={() => toggleLike(p.id)}>
      <Heart size={28} color={likedMap[p.id] ? "red" : "white"} />
      <div className="text-xs text-center">
        {likeCounts[p.id] || 0}
      </div>
    </button>

    <button onClick={() => openComments(p.id)}>
      <MessageCircle size={28} />
      <div className="text-xs text-center">
        {commentCounts[p.id] || 0}
      </div>
    </button>

    <button onClick={() => sharePost(p.id)}>
      <Share2 size={28} />
    </button>

    <button onClick={() => toggleRewards(p.id)}>
      <Gift size={28} />
    </button>

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
)}

    {/* COMMENTS MODAL */}
    {commentsOpen && (
      <div className="fixed inset-0 z-50">
        <button
          className="absolute inset-0 bg-black/60"
          onClick={closeComments}
        />
      </div>
    )}

    {/* MENU MODAL */}
{menuOpen && menuPost && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* backdrop */}
    <button
      className="absolute inset-0 bg-black/60"
      onClick={() => setMenuOpen(false)}
    />

    {/* modal */}
    <div className="relative w-[85%] max-w-sm bg-zinc-900/90 backdrop-blur-xl rounded-2xl p-4 text-white shadow-xl">

      {/* HEADER (FIXED) */}
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <img
          src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${menuPost.userEmail}`}
          className="w-10 h-10 rounded-full border border-white/20 shrink-0"
          alt=""
        />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">
            @{displayNameFromEmail(menuPost.userEmail || "")}
          </div>
        </div>

        <button
          onClick={() => onToggleFollow(menuPost.userEmail || "")}
          className={`text-xs px-3 py-1 rounded-full border ${
            followMap[(menuPost.userEmail || "").toLowerCase()]
              ? "bg-white text-black"
              : "border-white/30 text-white"
          }`}
        >
          {followMap[(menuPost.userEmail || "").toLowerCase()]
            ? "Following"
            : "Follow"}
        </button>
      </div>

      {/* ACTIONS */}
      <div className="divide-y divide-white/10 text-sm mt-2">
        <button className="w-full text-left py-3">Share</button>
        <button className="w-full text-left py-3">Save</button>
        <button className="w-full text-left py-3">Not interested</button>
        <button className="w-full text-left py-3 text-red-400">Report</button>
      </div>

      {/* CANCEL */}
      <button
        onClick={() => setMenuOpen(false)}
        className="w-full text-center py-3 mt-2 text-white/70"
      >
        Cancel
      </button>
    </div>
  </div>
)}
  </FeedLayout>
);
}