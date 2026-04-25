"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import RightRail from "@/components/RightRail";
import PostCaption from "@/components/PostCaption";
import CommentsPanel from "@/components/CommentsPanel";
import { useRouter } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";

type AnalyticsPayload = {
  surface: string;
  eventName: string;
  userEmail: string | null;
  postId: string | null;
  creatorEmail: string | null;
  properties: Record<string, unknown>;
};

function fireAnalytics(payload: AnalyticsPayload) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

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

let feedCache: { posts: any[]; ts: number } | null = null;
const FEED_CACHE_TTL = 30_000;

function PostSkeleton() {
  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        position: "relative",
        background: "linear-gradient(180deg, #0a0f1e 0%, #070b1b 100%)",
        overflow: "hidden",
        scrollSnapAlign: "start",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Right rail */}
      <div style={{ position: "absolute", right: 12, bottom: 120, display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
        {[52, 44, 44, 44, 44].map((size, i) => (
          <div key={i} className="animate-pulse" style={{ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
        ))}
      </div>
      {/* Caption */}
      <div style={{ padding: "20px 16px 50px", background: "linear-gradient(to top, rgba(5,8,20,0.95) 0%, transparent 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="animate-pulse" style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
          <div className="animate-pulse" style={{ height: 12, width: 90, borderRadius: 6, background: "rgba(255,255,255,0.1)" }} />
        </div>
        <div className="animate-pulse" style={{ height: 11, width: "75%", borderRadius: 6, background: "rgba(255,255,255,0.07)", marginBottom: 8 }} />
        <div className="animate-pulse" style={{ height: 11, width: "50%", borderRadius: 6, background: "rgba(255,255,255,0.07)" }} />
      </div>
    </div>
  );
}

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<any[]>(() => feedCache?.posts ?? []);
  const [loading, setLoading] = useState(feedCache === null);
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [commentsPanelPostId, setCommentsPanelPostId] = useState<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  const [rewardMap, setRewardMap] = useState<Record<string, number>>({});
  const stableNoiseRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      userEmailRef.current = email;
      setUserEmail(email);
    });
  }, []);

  useEffect(() => {
    fireAnalytics({
      surface: "feed",
      eventName: "session_start",
      userEmail: userEmailRef.current,
      postId: null,
      creatorEmail: null,
      properties: {},
    });
    return () => {
      fireAnalytics({
        surface: "feed",
        eventName: "session_end",
        userEmail: userEmailRef.current,
        postId: null,
        creatorEmail: null,
        properties: {},
      });
    };
  }, []);

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
    if (feedCache && Date.now() - feedCache.ts < FEED_CACHE_TTL) {
      setLoading(false);
      return;
    }
    fetch("/api/public-feed")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.posts)) {
          feedCache = { posts: data.posts, ts: Date.now() };
          setPosts(data.posts);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
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
    setCommentsPanelPostId(postId);
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
      fireAnalytics({
        surface: "feed",
        eventName: "post_share",
        userEmail: userEmailRef.current,
        postId,
        creatorEmail: post.userEmail ?? null,
        properties: {},
      });
    } catch (err) {
      console.error("Share failed", err);
    }
  }, [posts]);

  const handleReward = useCallback((postId: string) => {
    const post = posts.find((candidate) => String(candidate.id) === postId);
    fireAnalytics({
      surface: "feed",
      eventName: "post_reward",
      userEmail: userEmailRef.current,
      postId,
      creatorEmail: post?.userEmail ?? null,
      properties: {},
    });
    setRewardMap((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + 1,
    }));
  }, [posts]);

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
        <div
  onScroll={handleFeedScroll}
  style={{
    height: "100dvh",
    overflowY: "auto",
    scrollSnapType: "y mandatory",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
  className="no-scrollbar"
   >
      
      
        {loading && limitedPosts.length === 0 && <PostSkeleton />}
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
        isActive={i === activeIndex}
        rewardCount={rewardMap[post.id] || 0}
        commentsOpen={!!commentsPanelPostId}
      />
    </div>
))}
      </div>

      {commentsPanelPostId && (
        <CommentsPanel
          postId={commentsPanelPostId}
          userEmail={userEmail}
          onClose={() => setCommentsPanelPostId(null)}
        />
      )}
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
  isActive,
  rewardCount,
  commentsOpen,
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
  isActive: boolean;
  rewardCount: number;
  commentsOpen: boolean;
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
  const activeBoost = "";

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

  useEffect(() => {
    if (!isActive) return;
    // Only count a view if the user dwells for 600ms — prevents firing on every swipe-through.
    const t = window.setTimeout(() => {
      fireAnalytics({
        surface: "feed",
        eventName: "post_view",
        userEmail: currentUserId,
        postId,
        creatorEmail: post.userEmail ?? null,
        properties: {},
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, [isActive]);

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
      {post.muxPlaybackId ? (
  <VideoPlayer
    playbackId={post.muxPlaybackId}
    isActive={isActive}
    onTap={handleTap}
  />
) : post.imageUrl ? (
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
) : null}

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

      {!commentsOpen && (
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
          ringTier={post.ringTier}
        />
      )}

      {post.caption && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
          }}
        >
          <PostCaption
            username={post.handle || "user"}
            caption={post.caption}
            avatarUrl={post.avatarUrl}
            postId={String(post.id)}
            latestComment={post.latestComment ?? null}
            ringTier={post.ringTier}
          />
        </div>
      )}
    </div>
  );
});
