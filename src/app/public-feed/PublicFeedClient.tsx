"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import CreatorHint from "@/components/CreatorHint";
import CreatorPanel from "@/components/CreatorPanel";
import RightRail from "@/components/RightRail";
import PostCaption from "@/components/PostCaption";
import { useCreatorFeedback } from "@/hooks/useCreatorFeedback";
import { useRouter } from "next/navigation";
import CommentsList from "../../components/CommentsList";

const getClusterKey = (post: any) => {
  return post?.category || post?.type || "general";
};

const VISIBLE_LIMIT = 20;

const areNumberMapsEqual = (
  a: Record<string, number>,
  b: Record<string, number>,
) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => a[key] === b[key]);
};

const getStableNoise = (key: string) => {
  let hash = 0;

  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }

  return (Math.abs(hash) % 200) / 100;
};

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [visiblePosts, setVisiblePosts] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [interactionMap, setInteractionMap] = useState<Record<string, number>>({});
  const [clusterMap, setClusterMap] = useState<Record<string, number>>({});
  const [momentum, setMomentum] = useState<{
    cluster: string | null;
    strength: number;
  }>({
    cluster: null,
    strength: 0,
  });
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [replyTo, setReplyTo] = useState<{
  id: string;
  userEmail: string;
} | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const listRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(70);
  const [rewardMap, setRewardMap] = useState<Record<string, number>>({});
  const closeSheetTimeoutRef = useRef<number | null>(null);
  const stableNoiseRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const sendComment = async () => {
  if (!commentText.trim() || !userEmail || !activePostId) return;

  const payload = {
    postId: activePostId,
    userEmail: userEmail,
    body: commentText,
    parentId: replyTo?.id ?? null,
  };

  const res = await fetch("/api/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    setCommentText("");
    setReplyTo(null);
    setRefreshKey((prev) => prev + 1);
  } else {
    console.error("Comment failed", await res.text());
  }
};

useEffect(() => {
  document.body.style.overflow = showComments ? "hidden" : "";

  return () => {
    document.body.style.overflow = "";
  };
}, [showComments]);

useEffect(() => {
  if (listRef.current) {
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }
}, [refreshKey, showComments]);

useEffect(() => {
  const interval = window.setInterval(() => {
    setInteractionMap((prev) => {
      const updated: Record<string, number> = {};

      Object.entries(prev).forEach(([key, value]) => {
        const decayed = value * 0.82;
        if (decayed > 0.5) {
          updated[key] = decayed;
        }
      });

      return areNumberMapsEqual(prev, updated) ? prev : updated;
    });
  }, 5000);

  return () => window.clearInterval(interval);
}, []);

useEffect(() => {
  const interval = window.setInterval(() => {
    setClusterMap((prev) => {
      const updated: Record<string, number> = {};

      Object.entries(prev).forEach(([key, value]) => {
        const decayed = value * 0.88;
        if (decayed > 0.5) {
          updated[key] = decayed;
        }
      });

      return areNumberMapsEqual(prev, updated) ? prev : updated;
    });
  }, 7000);

  return () => window.clearInterval(interval);
}, []);

useEffect(() => {
  const entries = Object.entries(clusterMap);

  if (entries.length === 0) {
    setMomentum((prev) =>
      prev.cluster === null && prev.strength === 0
        ? prev
        : { cluster: null, strength: 0 }
    );
    return;
  }

  const [topCluster, value] = entries.sort((a, b) => b[1] - a[1])[0];

  if (value <= 2.4) {
    setMomentum((prev) =>
      prev.cluster === null && prev.strength === 0
        ? prev
        : { cluster: null, strength: 0 }
    );
    return;
  }

  const nextMomentum = {
    cluster: topCluster,
    strength: Math.min(value, 5),
  };

  setMomentum((prev) =>
    prev.cluster === nextMomentum.cluster && prev.strength === nextMomentum.strength
      ? prev
      : nextMomentum
  );
}, [clusterMap]);

useEffect(() => {
  const interval = window.setInterval(() => {
    setMomentum((prev) => {
      if (!prev.cluster) return prev;

      const newStrength = prev.strength * 0.85;

      if (newStrength < 0.5) {
        return prev.cluster === null && prev.strength === 0
          ? prev
          : { cluster: null, strength: 0 };
      }

      return newStrength === prev.strength
        ? prev
        : {
            ...prev,
            strength: newStrength,
          };
    });
  }, 4000);

  return () => window.clearInterval(interval);
}, []);

  const VOLTAGE_WEIGHT = 1;
  const INTERACTION_WEIGHT = 7;
  const CLUSTER_WEIGHT = 4;
  const MOMENTUM_WEIGHT = 5;
  const RECENCY_WEIGHT = 0.00000008;
  const MAX_MOMENTUM_STRENGTH = 4;

  useEffect(() => {
  fetch("/api/public-feed")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data.posts)) {
        setPosts(data.posts);
      }
    })
    .catch((err) => console.error(err));
}, []);

  useEffect(() => {
    posts.forEach((post, index) => {
      const key = String(post.id ?? index);
      if (stableNoiseRef.current[key] === undefined) {
        stableNoiseRef.current[key] = getStableNoise(key);
      }
    });
  }, [posts]);

  // Ranking philosophy:
  // 1. Voltage is the baseline public energy signal
  // 2. Direct interaction is the strongest session signal
  // 3. Cluster affinity shapes short-term content preference
  // 4. Momentum creates temporary waves without locking the feed
  // 5. Recency keeps fresh content in play
  const rankedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const vA = a.voltage || 0;
      const vB = b.voltage || 0;
      const iA = interactionMap[String(a.id)] || 0;
      const iB = interactionMap[String(b.id)] || 0;
      const cA = clusterMap[getClusterKey(a)] || 0;
      const cB = clusterMap[getClusterKey(b)] || 0;
      const mA =
        momentum.cluster && getClusterKey(a) === momentum.cluster
          ? Math.min(momentum.strength, MAX_MOMENTUM_STRENGTH) * MOMENTUM_WEIGHT
          : 0;
      const mB =
        momentum.cluster && getClusterKey(b) === momentum.cluster
          ? Math.min(momentum.strength, MAX_MOMENTUM_STRENGTH) * MOMENTUM_WEIGHT
          : 0;
      const noiseA = stableNoiseRef.current[String(a.id)] || 0;
      const noiseB = stableNoiseRef.current[String(b.id)] || 0;

      const scoreA =
        vA * VOLTAGE_WEIGHT +
        iA * INTERACTION_WEIGHT +
        cA * CLUSTER_WEIGHT +
        mA +
        (a.createdAt ? new Date(a.createdAt).getTime() * RECENCY_WEIGHT : 0) +
        noiseA;
      const scoreB =
        vB * VOLTAGE_WEIGHT +
        iB * INTERACTION_WEIGHT +
        cB * CLUSTER_WEIGHT +
        mB +
        (b.createdAt ? new Date(b.createdAt).getTime() * RECENCY_WEIGHT : 0) +
        noiseB;

      return scoreB - scoreA;
    });
  }, [posts, interactionMap, clusterMap, momentum]);

  const [debouncedRanked, setDebouncedRanked] = useState(rankedPosts);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedRanked(rankedPosts);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [rankedPosts]);

  useEffect(() => {
    if (visiblePosts.length === 0) {
      setVisiblePosts(debouncedRanked);
      return;
    }

    const isSafeToUpdate = activeIndex < 2;

    if (isSafeToUpdate) {
      setVisiblePosts(debouncedRanked);
    }
  }, [debouncedRanked, activeIndex, visiblePosts.length]);

  const limitedPosts = useMemo(
    () => visiblePosts.slice(0, VISIBLE_LIMIT),
    [visiblePosts],
  );

  const openComments = useCallback((postId: string) => {
    if (closeSheetTimeoutRef.current) {
      window.clearTimeout(closeSheetTimeoutRef.current);
      closeSheetTimeoutRef.current = null;
    }

    setActivePostId(postId);
    setShowComments(true);

    requestAnimationFrame(() => {
      setCommentsOpen(true);
    });
  }, []);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
    setReplyTo(null);

    closeSheetTimeoutRef.current = window.setTimeout(() => {
      setShowComments(false);
      setActivePostId(null);
      setSheetHeight(70);
      setDragY(0);
      closeSheetTimeoutRef.current = null;
    }, 200);
  }, []);

  const handleShare = useCallback(async (postId: string) => {
    const post = posts.find((candidate) => String(candidate.id) === postId);
    if (!post) return;

    const shareUrl = `${window.location.origin}/post/${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Revolvr",
          text: post.caption || "Check this out",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  }, [posts]);

  const handleReward = useCallback((postId: string) => {
    console.log("REWARD CLICKED", postId);
    setRewardMap((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + 1,
    }));
  }, []);

  const handleCreate = useCallback(() => {
    router.push("/create");
  }, [router]);

  const handleDoubleTapLike = useCallback((postId: string) => {
    setLikedMap((prev) => {
      if (prev[postId]) return prev;

      return {
        ...prev,
        [postId]: true,
      };
    });
  }, []);

  const handleInteract = useCallback((postId: string) => {
    const post = posts.find((candidate) => String(candidate.id) === postId);
    const cluster = getClusterKey(post);

    setInteractionMap((prev) => {
      const nextValue = Math.min((prev[postId] || 0) + 0.8, 6);
      if (prev[postId] === nextValue) return prev;

      return {
        ...prev,
        [postId]: nextValue,
      };
    });

    setClusterMap((prev) => {
      const nextValue = Math.min((prev[cluster] || 0) + 0.6, 5);
      if (prev[cluster] === nextValue) return prev;

      return {
        ...prev,
        [cluster]: nextValue,
      };
    });
  }, [posts]);

  const handleFeedScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const index = Math.round(e.currentTarget.scrollTop / window.innerHeight);
    setActiveIndex((prev) => (prev === index ? prev : index));
  }, []);

  useEffect(() => {
    return () => {
      if (closeSheetTimeoutRef.current) {
        window.clearTimeout(closeSheetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
  style={{
    position: "relative",
    height: "100dvh",
    width: "100%",
    margin: "0 auto",
    overflow: "hidden"
  }}
>
{showComments && (
  <div className="absolute inset-0 z-40 flex items-end justify-center">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      onClick={closeComments}
    />

    <div
      className={`relative flex h-[70%] w-full max-w-[420px] flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#050814] transform transition-transform duration-200 ${
        commentsOpen ? "translate-y-0" : "translate-y-full"
      }`}
      onTouchStart={(e) => {
        setIsDragging(true);
        setStartY(e.touches[0].clientY);
      }}
      onTouchMove={(e) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const delta = currentY - startY;

        if (delta > 0) {
          setDragY(delta);
        }

        if (delta < 0) {
          const newHeight = Math.min(90, 62 + Math.abs(delta / 5));
          setSheetHeight(newHeight);
        }
      }}
      onTouchEnd={() => {
        setIsDragging(false);

        if (dragY > 140) {
          closeComments();
          setDragY(0);
          return;
        }

        if (sheetHeight > 75) {
          setSheetHeight(90);
        } else {
          setSheetHeight(70);
        }

        setDragY(0);
      }}
      style={{
        height: `${sheetHeight}dvh`,
        maxHeight: `${sheetHeight}dvh`,
        boxShadow: "0 -6px 24px rgba(0,0,0,0.5)",
        zIndex: 200,
        color: "white",
        transition: isDragging ? "none" : "all 0.25s ease",
        transform: commentsOpen ? `translateY(${dragY}px)` : "translateY(100%)",
        overscrollBehavior: "contain",
      }}
    >
    {/* HEADER */}
    <div className="flex-shrink-0 text-center">
      <div className="flex justify-center pt-2 pb-1">
        <div className="h-1.5 w-10 rounded-full bg-white/20" />
      </div>
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="text-white text-sm font-semibold tracking-wide">
          Comments
        </div>
      </div>
    </div>

    {/* LIST */}
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-4"
    >
      <CommentsList
        postId={activePostId}
        refreshKey={refreshKey}
        setReplyTo={setReplyTo}
        replyTo={replyTo}
      />
    </div>

    {/* INPUT */}
    <div className="border-t border-white/10 bg-[#050814] px-4 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
      {replyTo && (
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginBottom: 5,
            paddingLeft: 4,
          }}
        >
          Replying to @{replyTo.userEmail}
          <span
            onClick={() => setReplyTo(null)}
            style={{ marginLeft: 8, cursor: "pointer", opacity: 0.7 }}
          >
            ✕
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          autoFocus
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
          placeholder={
            replyTo
              ? `Reply to @${replyTo.userEmail}...`
              : "Add a comment..."
          }
          className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          onClick={sendComment}
          type="button"
          className="text-sm font-semibold text-white/80"
        >
          Send
        </button>
      </div>
    </div>
    </div>
  </div>
)}
        <div
  onScroll={handleFeedScroll}
  style={{
    height: "100dvh",
    overflowY: showComments ? "hidden" : "auto",
    scrollSnapType: "y mandatory",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
  className="no-scrollbar"
   >
      
      
        {limitedPosts.map((post, i) => (
    <div
      key={post.id ?? i}
      className="h-full w-full flex-shrink-0 transition-transform transition-shadow duration-300 ease-out"
    >
      <Post
        post={post}
        liked={!!likedMap[String(post.id ?? i)]}
        onDoubleTapLike={handleDoubleTapLike}
        onOpenComments={openComments}
        onShare={handleShare}
        onReward={handleReward}
        onCreate={handleCreate}
        onInteract={handleInteract}
        currentUserId={userEmail}
        interactionCount={interactionMap[String(post.id)] || 0}
        momentumStrength={momentum.strength}
        showComments={showComments}
        activePostId={activePostId}
        isActive={i === activeIndex}
        rewardCount={rewardMap[post.id] || 0}
      />
    </div>
))}
      </div>
    </div>
  );
}
const Post = memo(function Post({
  post,
  liked,
  onDoubleTapLike,
  onOpenComments,
  onShare,
  onReward,
  onCreate,
  onInteract,
  currentUserId,
  interactionCount,
  momentumStrength,
  showComments,
  activePostId,
  isActive,
  rewardCount,
}: {
  post: any;
  liked: boolean;
  onDoubleTapLike: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onShare: (postId: string) => void;
  onReward: (postId: string) => void;
  onCreate: () => void;
  onInteract: (postId: string) => void;
  currentUserId: string | null;
  interactionCount: number;
  momentumStrength: number;
  showComments: boolean;
  activePostId: string | null;
  isActive: boolean;
  rewardCount: number;
}) {
  const [showBurst, setShowBurst] = useState(false);
  const [localBoost, setLocalBoost] = useState(0);
  const lastTapRef = useRef(0);
  const boostTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const MAX_VOLTAGE = 100;
  const BOOST_AMOUNT = 20;
  const postId = String(post.id ?? "");
  const baseVoltage = post.voltage || 0;
  const voltage = Math.min(baseVoltage + localBoost, MAX_VOLTAGE);
  const voltageScale =
    voltage > 80
      ? "scale-[1.008]"
      : voltage > 50
      ? "scale-[1.003]"
      : "";
  const voltageGlow =
    voltage > 80
      ? "shadow-[0_0_20px_rgba(255,255,255,0.05)]"
      : voltage > 50
      ? "shadow-[0_0_16px_rgba(255,255,255,0.04)]"
      : "";
  const voltagePulse =
    voltage > 85
      ? "animate-[postPulse_3s_ease-in-out]"
      : voltage > 60
      ? "animate-[postPulse_3.5s_ease-in-out]"
      : localBoost > 0
      ? "animate-[postPulse_1.2s_ease-out]"
      : "";
  const activeBoost = isActive ? "scale-[1.008]" : "";
  const feedbackMessage = useCreatorFeedback({
    voltage,
    recentVoltage: baseVoltage,
    lastPostTime: post.createdAt
      ? new Date(post.createdAt).getTime()
      : Date.now(),
  });

  useEffect(() => {
    return () => {
      if (boostTimeoutRef.current) {
        window.clearTimeout(boostTimeoutRef.current);
      }

      if (burstTimeoutRef.current) {
        window.clearTimeout(burstTimeoutRef.current);
      }
    };
  }, []);

  const handleInteract = useCallback(() => {
    if (boostTimeoutRef.current) return false;

    onDoubleTapLike(postId);
    onInteract(postId);
    setLocalBoost((prev) => prev + BOOST_AMOUNT);

    boostTimeoutRef.current = window.setTimeout(() => {
      setLocalBoost((prev) => Math.max(prev - BOOST_AMOUNT, 0));
      boostTimeoutRef.current = null;
    }, 200);

    return true;
  }, [onDoubleTapLike, onInteract, postId]);

  const handleTap = useCallback(() => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      const didInteract = handleInteract();

      if (didInteract) {
        setShowBurst(true);

        if (burstTimeoutRef.current) {
          window.clearTimeout(burstTimeoutRef.current);
        }

        burstTimeoutRef.current = window.setTimeout(() => {
          setShowBurst(false);
          burstTimeoutRef.current = null;
        }, 600);
      }
    }

    lastTapRef.current = now;
  }, [handleInteract]);

  const handleOpenComments = useCallback(() => {
    onOpenComments(postId);
  }, [onOpenComments, postId]);

  const handleShare = useCallback(() => {
    onShare(postId);
  }, [onShare, postId]);

  const handleReward = useCallback(() => {
    onReward(postId);
  }, [onReward, postId]);

  const handleCreate = useCallback(() => {
    onCreate();
  }, [onCreate]);

  const isCommentsActive = showComments && activePostId === post.id;
  const isOwner = post.userEmail === currentUserId;

  return (
    <div
      className={`relative h-full w-full flex-shrink-0 transition-transform transition-shadow duration-300 ease-out active:scale-[0.995] ${voltageScale} ${voltageGlow} ${voltagePulse} ${activeBoost}`}
      style={{
        height: "100dvh",
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        position: "relative",
        overflow: "hidden",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          loading="lazy"
          onClick={handleTap}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
             objectPosition: "center center",
            zIndex: 0,
            cursor: "pointer",
          }}
        />
      )}

      {showBurst && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <Heart size={90} fill="white" stroke="none" />
        </div>
      )}

      {localBoost > 0 && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div className="animate-[heartPop_0.6s_ease-out] text-4xl text-white opacity-80">
            ⚡
          </div>
        </div>
      )}

      {isOwner && <CreatorHint message={feedbackMessage} />}

      {isOwner && (
        <CreatorPanel
          voltage={voltage}
          interactions={interactionCount}
          comments={post.commentCount || 0}
          momentum={momentumStrength}
        />
      )}

      <RightRail
        liked={liked}
        onLike={handleInteract}
        onComment={handleOpenComments}
        onShare={handleShare}
        onReward={handleReward}
        onCreate={handleCreate}
        rewardCount={rewardCount}
        avatarUrl={post.avatarUrl}
        username={post.handle ? `@${post.handle}` : undefined}
      />

      {post.caption && !isCommentsActive && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            pointerEvents: showComments ? "none" : "auto",
          }}
        >
          <PostCaption
            username={post.handle || "user"}
            caption={post.caption}
          />
        </div>
      )}
    </div>
  );
});
