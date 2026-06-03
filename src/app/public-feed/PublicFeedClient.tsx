"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  ThumbsUp,
  MessageCircle,
  Send,
  Gift,
  Plus,
  Repeat2,
  Bookmark,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import CommentsPanel from "@/components/CommentsPanel";
import { useRouter } from "next/navigation";
import ControlPanel from "@/components/ControlPanel";
import VideoPlayer from "@/components/VideoPlayer";
import MediaCarousel from "@/components/MediaCarousel";
import PeopleCard, { type PeopleCardUser } from "@/components/PeopleCard";
import GathWindow from "@/components/GathWindow";
import TopBar from "@/components/TopBar";

const GOLD = "#F5C518";
const ACTION_KEYS = ["LIKE", "COMMENT", "MESSAGE", "GATH", "GIFT", "CREATE", "REPOST", "SAVE"] as const;
type ActionKey = (typeof ACTION_KEYS)[number];

const ACTION_ICONS: Record<
  ActionKey,
  { Icon: typeof ThumbsUp; glow: string }
> = {
  LIKE: { Icon: ThumbsUp, glow: "#ff4d6d" },
  COMMENT: { Icon: MessageCircle, glow: "#5ec5ff" },
  MESSAGE: { Icon: Send, glow: "#fb923c" },
  GIFT: { Icon: Gift, glow: GOLD },
  CREATE: { Icon: Plus, glow: "#ffffff" },
  REPOST: { Icon: Repeat2, glow: "#3ddc97" },
  SAVE: { Icon: Bookmark, glow: "#c084fc" },
  GATH: { Icon: Users, glow: GOLD },
};

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

export function resetFeedCache() {
  feedCache = null;
}

const FRESH_POST_WINDOW_MS = 300_000;

// Module-level so dismissals survive Post unmount/remount during scroll.
const dismissedTranches = new Set<string>();

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

export default function PublicFeedClient({ dmEnabled }: { dmEnabled: boolean }) {
  const [posts, setPosts] = useState<any[]>(() => feedCache?.posts ?? []);
  const [loading, setLoading] = useState(feedCache === null);
  const [visiblePosts, setVisiblePosts] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [repostedMap, setRepostedMap] = useState<Record<string, boolean>>({});
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
  const [isCreator, setIsCreator] = useState(false);
  const [commentsPanelPostId, setCommentsPanelPostId] = useState<string | null>(null);
  const [controlPanelUserId, setControlPanelUserId] = useState<string | null>(null);
  const userEmailRef = useRef<string | null>(null);
  const [rewardMap, setRewardMap] = useState<Record<string, number>>({});
  const stableNoiseRef = useRef<Record<string, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstPostRef = useRef<HTMLDivElement | null>(null);
  const [hasFirstPostRendered, setHasFirstPostRendered] = useState(false);
  const [peopleRow, setPeopleRow] = useState<PeopleCardUser[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PeopleCardUser | null>(null);
  const [gathWindowPostId, setGathWindowPostId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/people-rail")
      .then((r) => r.json())
      .then((data) => {
        const merged: PeopleCardUser[] = [
          ...(Array.isArray(data.live) ? data.live : []),
          ...(Array.isArray(data.creators) ? data.creators : []),
          ...(Array.isArray(data.newPeople) ? data.newPeople : []),
        ];
        const seen = new Set<string>();
        const deduped = merged.filter((p) => {
          if (!p?.handle || seen.has(p.handle)) return false;
          seen.add(p.handle);
          return true;
        });
        setPeopleRow(deduped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email ?? null;
      userEmailRef.current = email;
      setUserEmail(email);
    });
    // Check creator status
    fetch("/api/creator/me")
      .then(r => r.json())
      .then(d => { if (d?.email) setIsCreator(true) })
      .catch(() => {})
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

const clusterMapRef = useRef<Record<string, number>>({});
useEffect(() => { clusterMapRef.current = clusterMap; }, [clusterMap]);

useEffect(() => {
  const interval = window.setInterval(() => {
    // 1. interactionMap decay
    setInteractionMap((prev) => {
      const updated: Record<string, number> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const decayed = value * 0.82;
        if (decayed > 0.5) updated[key] = decayed;
      });
      return areNumberMapsEqual(prev, updated) ? prev : updated;
    });

    // 2. clusterMap decay — sync ref synchronously so step 3 sees the new value
    setClusterMap((prev) => {
      const updated: Record<string, number> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const decayed = value * 0.88;
        if (decayed > 0.5) updated[key] = decayed;
      });
      const next = areNumberMapsEqual(prev, updated) ? prev : updated;
      clusterMapRef.current = next;
      return next;
    });

    // 3 + 4. Re-derive momentum from decayed clusterMap, then apply momentum decay
    setMomentum((prev) => {
      const entries = Object.entries(clusterMapRef.current);
      let next: { cluster: string | null; strength: number };

      if (entries.length === 0) {
        next = { cluster: null, strength: 0 };
      } else {
        const [topCluster, value] = entries.sort((a, b) => b[1] - a[1])[0];
        next = value <= 2.4
          ? { cluster: null, strength: 0 }
          : { cluster: topCluster, strength: Math.min(value, 5) };
      }

      if (next.cluster) {
        const decayed = next.strength * 0.85;
        next = decayed < 0.5
          ? { cluster: null, strength: 0 }
          : { cluster: next.cluster, strength: decayed };
      }

      return prev.cluster === next.cluster && prev.strength === next.strength ? prev : next;
    });
  }, 5000);

  return () => window.clearInterval(interval);
}, []);

  const VOLTAGE_WEIGHT = 1;
  const INTERACTION_WEIGHT = 7;
  const CLUSTER_WEIGHT = 4;
  const MOMENTUM_WEIGHT = 5;
  const RECENCY_WEIGHT = 0.0000002;
  const MAX_MOMENTUM_STRENGTH = 4;

  useEffect(() => {
    if (feedCache && Date.now() - feedCache.ts < FEED_CACHE_TTL) {
      setLoading(false);
      return;
    }
    fetch(`/api/public-feed?t=${Date.now()}`)
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

  useEffect(() => {
    if (hasFirstPostRendered) return;
    const el = firstPostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasFirstPostRendered(true);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visiblePosts.length, hasFirstPostRendered]);

  // Skeleton fallback: the skeleton is the first scroll-snap item, so the
  // first post sits below the fold and the IntersectionObserver never trips
  // until the user manually scrolls. Force-resolve after 2s once we know
  // posts are loaded so the feed is never permanently masked by the skeleton.
  useEffect(() => {
    if (hasFirstPostRendered || posts.length === 0) return;
    const t = window.setTimeout(() => setHasFirstPostRendered(true), 2000);
    return () => window.clearTimeout(t);
  }, [posts.length, hasFirstPostRendered]);

  // Ranking philosophy:
  // 1. Voltage is the baseline public energy signal
  // 2. Direct interaction is the strongest session signal
  // 3. Cluster affinity shapes short-term content preference
  // 4. Momentum creates temporary waves without locking the feed
  // 5. Recency keeps fresh content in play
  const rankedPosts = useMemo(() => {
    const now = Date.now();
    const fresh: any[] = [];
    const rest: any[] = [];
    for (const post of posts) {
      const createdAtMs = post.createdAt ? new Date(post.createdAt).getTime() : 0;
      if (createdAtMs && now - createdAtMs < FRESH_POST_WINDOW_MS) {
        fresh.push(post);
      } else {
        rest.push(post);
      }
    }
    fresh.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    rest.sort((a, b) => {
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
    return [...fresh, ...rest];
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

  const handleOpenGath = useCallback((postId: string) => {
    setGathWindowPostId(postId);
  }, []);

  const handleGoLive = useCallback(() => {
  router.push("/go-live");
}, [router]);

  const handleDoubleTapLike = useCallback((postId: string) => {
    const email = userEmailRef.current;
    if (!email) {
      setLikedMap((prev) => (prev[postId] ? prev : { ...prev, [postId]: true }));
      return;
    }

    let optimisticNext = false;
    setLikedMap((prev) => {
      optimisticNext = !prev[postId];
      return { ...prev, [postId]: optimisticNext };
    });

    fetch("/api/likes/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userEmail: email }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`like_failed_${res.status}`);
        const data = (await res.json().catch(() => null)) as { liked?: boolean } | null;
        if (data && typeof data.liked === "boolean" && data.liked !== optimisticNext) {
          setLikedMap((prev) => ({ ...prev, [postId]: data.liked! }));
        }
      })
      .catch((err) => {
        console.error("Like toggle failed:", err);
        setLikedMap((prev) => ({ ...prev, [postId]: !optimisticNext }));
      });
  }, []);

  const handleToggleSave = useCallback((postId: string) => {
    const email = userEmailRef.current;
    if (!email) {
      setSavedMap((prev) => (prev[postId] ? prev : { ...prev, [postId]: true }));
      return;
    }

    let optimisticNext = false;
    setSavedMap((prev) => {
      optimisticNext = !prev[postId];
      return { ...prev, [postId]: optimisticNext };
    });

    fetch("/api/saves/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userEmail: email }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`save_failed_${res.status}`);
        const data = (await res.json().catch(() => null)) as { saved?: boolean } | null;
        if (data && typeof data.saved === "boolean" && data.saved !== optimisticNext) {
          setSavedMap((prev) => ({ ...prev, [postId]: data.saved! }));
        }
      })
      .catch((err) => {
        console.error("Save toggle failed:", err);
        setSavedMap((prev) => ({ ...prev, [postId]: !optimisticNext }));
      });
  }, []);

  const handleToggleRepost = useCallback((postId: string) => {
    const email = userEmailRef.current;
    if (!email) {
      setRepostedMap((prev) => (prev[postId] ? prev : { ...prev, [postId]: true }));
      return;
    }

    let optimisticNext = false;
    setRepostedMap((prev) => {
      optimisticNext = !prev[postId];
      return { ...prev, [postId]: optimisticNext };
    });

    fetch("/api/reposts/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, userEmail: email }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`repost_failed_${res.status}`);
        const data = (await res.json().catch(() => null)) as { reposted?: boolean } | null;
        if (data && typeof data.reposted === "boolean" && data.reposted !== optimisticNext) {
          setRepostedMap((prev) => ({ ...prev, [postId]: data.reposted! }));
        }
      })
      .catch((err) => {
        console.error("Repost toggle failed:", err);
        setRepostedMap((prev) => ({ ...prev, [postId]: !optimisticNext }));
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
        <TopBar />
        <div
  ref={scrollContainerRef}
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
      
      
        {!hasFirstPostRendered && <PostSkeleton />}
        {limitedPosts.map((post, i) => (

    <div
      key={post.id ?? i}
      ref={i === 0 ? firstPostRef : undefined}
      className="h-full w-full flex-shrink-0 transition-transform transition-shadow duration-300 ease-out"
    >
      <Post
        post={post}
        liked={!!likedMap[String(post.id ?? i)]}
        saved={!!savedMap[String(post.id ?? i)]}
        reposted={!!repostedMap[String(post.id ?? i)]}
        onToggleSave={handleToggleSave}
        onToggleRepost={handleToggleRepost}
        onDoubleTapLike={handleDoubleTapLike}
        onOpenComments={openComments}
        onShare={handleShare}
        onReward={handleReward}
        onCreate={handleCreate}
        onGoLive={handleGoLive}
        onInteract={handleInteract}
        dmEnabled={dmEnabled}
        currentUserId={userEmail}
        interactionCount={interactionMap[String(post.id)] || 0}
        momentumStrength={momentum.strength}
        isActive={i === activeIndex}
        isNext={i === activeIndex + 1}
        rewardCount={rewardMap[post.id] || 0}
        commentsOpen={!!commentsPanelPostId}
        onOpenControlPanel={(userId) => setControlPanelUserId(userId)}
        scrollContainerRef={scrollContainerRef}
        people={peopleRow}
        onSelectPerson={setSelectedPerson}
        onOpenGath={handleOpenGath}
      />
    </div>
))}
      </div>

      {commentsPanelPostId && (
        <CommentsPanel
          open={!!commentsPanelPostId}
          postId={commentsPanelPostId}
          userEmail={userEmail}
          onClose={() => setCommentsPanelPostId(null)}
        />
      )}

      {controlPanelUserId && (
        <ControlPanel userId={controlPanelUserId} onClose={() => setControlPanelUserId(null)} />
      )}

      {selectedPerson && (
        <PeopleCard user={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}

      <GathWindow
        open={gathWindowPostId !== null}
        onClose={() => setGathWindowPostId(null)}
        userEmail={userEmail}
        seedPostId={gathWindowPostId}
      />
    </div>
  );
}

const Post = memo(function Post({
  post,
  liked,
  saved,
  reposted,
  onToggleSave,
  onToggleRepost,
  onDoubleTapLike,
  onOpenComments,
  onShare,
  onReward,
  onCreate,
  onGoLive,
  onInteract,
  dmEnabled,
  currentUserId,
  interactionCount,
  momentumStrength,
  isActive,
  isNext,
  rewardCount,
  commentsOpen,
  scrollContainerRef,
  people,
  onOpenControlPanel,
  onSelectPerson,
  onOpenGath,
}: {
  post: any;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  onToggleSave: (postId: string) => void;
  onToggleRepost: (postId: string) => void;
  onDoubleTapLike: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onShare: (postId: string) => void;
  onReward: (postId: string) => void;
  onCreate: () => void;
  onGoLive: () => void;
  onInteract: (postId: string) => void;
  dmEnabled: boolean;
  currentUserId: string | null;
  interactionCount: number;
  momentumStrength: number;
  isActive: boolean;
  isNext: boolean;
  rewardCount: number;
  commentsOpen: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  people: PeopleCardUser[];
  onOpenControlPanel: (userId: string) => void;
  onSelectPerson: (p: PeopleCardUser) => void;
  onOpenGath: (postId: string) => void;
}) {
  const router = useRouter();
  const [showBurst, setShowBurst] = useState(false);
  const [localBoost, setLocalBoost] = useState(0);
  const [liveAvatarSrc, setLiveAvatarSrc] = useState<string | null>(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (post.isLive && post.avatarUrl) {
      setLiveAvatarSrc(post.avatarUrl);
    }
  }, [post.isLive, post.avatarUrl]);
  const boostTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const burstTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const BOOST_AMOUNT = 20;
  const postId = String(post.id ?? "");
  const voltage = (post.voltage || 0) + localBoost;
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

  const handleSave = useCallback(() => {
    onToggleSave(postId);
  }, [onToggleSave, postId]);

  const handleRepost = useCallback(() => {
    onToggleRepost(postId);
  }, [onToggleRepost, postId]);

  const handleCreate = useCallback(() => {
    onCreate();
  }, [onCreate]);

  const handleGath = useCallback(() => {
    onOpenGath(postId);
  }, [onOpenGath, postId]);

  const isOwner = post.userEmail === currentUserId;

  // DM the creator in context: resolve-or-create the 1:1 thread, then route to it.
  const handleMessage = useCallback(async () => {
    if (!dmEnabled) return; // DMs are dark until age assurance is real
    const target = post.userEmail;
    if (!target || isOwner) return; // can't DM yourself
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.conversationId) return;
      router.push(`/messages?c=${data.conversationId}`);
    } catch {
      /* best-effort */
    }
  }, [dmEnabled, post.userEmail, isOwner, router]);

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
      {post.isLive && (post.livePlaybackId || post.ivsPlaybackUrl) ? (
    <div
    style={{
      position: "absolute", top: 0, left: 0,
      width: "100%", height: "100%",
      background: "#000", zIndex: 1,
      touchAction: "manipulation",
    }}
  >
    {/* Gradient background */}
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(135deg, #080808 0%, #0d0d0d 60%, #0a0a14 100%)",
      boxShadow: "inset 0 0 80px rgba(255,215,0,0.03)",
    }} />

    {/* Pulsing ring + avatar */}
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
      zIndex: 10,
    }}>
      <div style={{ position: "relative" }}>
        <div style={{
          position: "absolute", inset: -6,
          borderRadius: "50%",
          border: "3px solid #FFD700",
          animation: "livePulseRing 1.5s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", inset: -12,
          borderRadius: "50%",
          border: "2px solid rgba(255,215,0,0.2)",
          animation: "livePulseRing 1.5s ease-in-out infinite 0.3s",
        }} />
        {liveAvatarSrc ? (
          <img src={liveAvatarSrc} style={{
            width: 80, height: 80, borderRadius: "50%",
            objectFit: "cover", border: "3px solid #fff",
          }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "#333", border: "3px solid #fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, color: "#fff", fontWeight: 700,
          }}>
            {post.displayName?.[0]?.toUpperCase() || "?"}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          {post.displayName}
        </div>
        <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
          is live now
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginTop: 8,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: "#FFD700",
          boxShadow: "0 0 8px #FFD700",
          animation: "livePulse 1s ease-in-out infinite",
        }} />
        <span style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 11, letterSpacing: "0.2em",
          fontFamily: "monospace", textTransform: "uppercase",
        }}>
          ⚡ {post.voltage || 0} voltage
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          const url = post.ivsPlaybackUrl
            ? `/live/${post.id}?ivs=1&playback=${encodeURIComponent(post.ivsPlaybackUrl)}`
            : `/live/${post.liveStreamId}`;
          window.location.href = url;
        }}
        style={{
          marginTop: 20,
          background: "rgba(255,215,0,0.15)",
          border: "1px solid rgba(255,215,0,0.5)",
          borderRadius: 50,
          padding: "10px 32px",
          color: "#FFD700",
          fontSize: 13,
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.15em",
          cursor: "pointer",
        }}
      >
        JOIN LIVE
      </button>
    </div>

    {/* Bottom info */}
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      padding: "40px 20px 20px",
      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)",
      zIndex: 10,
    }}>
      <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
        {post.caption}
      </div>
    </div>

    <style>{`
      @keyframes livePulseRing {
        0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(255,215,0,0.4); }
        50% { opacity: 0.7; transform: scale(1.04); box-shadow: 0 0 20px 4px rgba(255,215,0,0.15); }
      }
    `}</style>
  </div>
) : post.muxPlaybackId ? (
  <VideoPlayer
    playbackId={post.muxPlaybackId}
    isActive={isActive}
    isNext={isNext}
    onTap={handleTap}
    scrollContainerRef={scrollContainerRef}
  />
) : post.media?.length > 1 ? (
  <MediaCarousel media={post.media} onTap={handleTap} />
) : post.imageUrl ? (
  <img
    src={post.imageUrl}
    loading="lazy"
    onClick={handleTap}
    style={{
      position: "absolute", top: 0, left: 0,
      width: "100%", height: "100%",
      objectFit: "cover", objectPosition: "center center",
      zIndex: 0, cursor: "pointer",
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
        <FeedOverlay
          post={post}
          voltage={voltage}
          dmEnabled={dmEnabled}
          people={people}
          onSelectPerson={onSelectPerson}
          onLike={handleInteract}
          onComment={handleOpenComments}
          onMessage={handleMessage}
          onShare={handleShare}
          onReward={handleReward}
          onCreate={handleCreate}
          onSave={handleSave}
          onRepost={handleRepost}
          onGath={handleGath}
          onOpenControlPanel={onOpenControlPanel}
          liked={liked}
          saved={saved}
          reposted={reposted}
          rewardCount={rewardCount}
        />
      )}
    </div>
  );
});

function VoltageSpark({ size = 11, color = GOLD }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function FeedOverlay({
  post,
  voltage,
  dmEnabled,
  people,
  onSelectPerson,
  onLike,
  onComment,
  onMessage,
  onShare: _onShare,
  onReward,
  onCreate,
  onSave,
  onRepost,
  onGath,
  onOpenControlPanel,
  liked,
  saved,
  reposted,
  rewardCount: _rewardCount,
}: {
  post: any;
  voltage: number;
  dmEnabled: boolean;
  people: PeopleCardUser[];
  onSelectPerson: (p: PeopleCardUser) => void;
  onLike: () => void;
  onComment: () => void;
  onMessage: () => void;
  onShare: () => void;
  onReward: () => void;
  onCreate: () => void;
  onSave: () => void;
  onRepost: () => void;
  onGath: () => void;
  onOpenControlPanel: (userId: string) => void;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  rewardCount: number;
}) {
  const [tickedVoltage, setTickedVoltage] = useState(voltage);
  useEffect(() => {
    setTickedVoltage(voltage);
    const id = window.setInterval(() => {
      setTickedVoltage((v) => v + 1);
    }, 8000);
    return () => window.clearInterval(id);
  }, [voltage]);

  const trancheKey = String(post.id ?? "");
  const [trancheVisible, setTrancheVisible] = useState(false);
  const [trancheDismissed, setTrancheDismissed] = useState(() =>
    dismissedTranches.has(trancheKey),
  );
  useEffect(() => {
    if (trancheDismissed) return;
    if (voltage <= 500) return;
    // 5s earn-in delay so TRANCHE feels like it climbed there, not a load artefact.
    const t = window.setTimeout(() => setTrancheVisible(true), 5000);
    return () => window.clearTimeout(t);
  }, [voltage, trancheDismissed]);

  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [giftPending, setGiftPending] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const showFlash = useCallback((msg: string) => {
    setFlashMessage(msg);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashMessage(null), 900);
  }, []);
  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
  }, []);

  const handleAction = useCallback(
    (key: ActionKey) => {
      switch (key) {
        case "LIKE":
          onLike();
          showFlash(liked ? "UNLIKED" : "LIKED");
          break;
        case "COMMENT":
          onComment();
          break;
        case "MESSAGE":
          onMessage();
          break;
        case "GIFT":
          if (giftPending) break;
          if (post.isLive && post.liveStreamId) {
            onReward();
            setGiftPending(true);
            fetch("/api/live/gift", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                giftId: "pulse",
                streamId: post.liveStreamId,
                creatorEmail: post.userEmail,
              }),
            })
              .then(async (r) => {
                if (r.ok) {
                  showFlash("⚡ GIFT SENT");
                  return;
                }
                const body = (await r.json().catch(() => ({}))) as { error?: string };
                const msg = typeof body.error === "string" ? body.error : "";
                showFlash(/sparks/i.test(msg) ? "NOT ENOUGH SPARKS" : "GIFT FAILED");
              })
              .catch(() => showFlash("GIFT FAILED"))
              .finally(() => setGiftPending(false));
          } else {
            showFlash("GIFTS FOR LIVE STREAMS");
          }
          break;
        case "CREATE":
          onCreate();
          break;
        case "REPOST":
          onRepost();
          showFlash(reposted ? "UNREPOSTED" : "REPOSTED");
          break;
        case "SAVE":
          onSave();
          showFlash(saved ? "UNSAVED" : "SAVED");
          break;
        case "GATH":
          onGath();
          break;
      }
    },
    [onLike, onComment, onMessage, onReward, onCreate, onSave, onRepost, onGath, liked, saved, reposted, showFlash, post, giftPending],
  );

  return (
    <>
      {flashMessage && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 50,
            padding: "8px 18px",
            background: "rgba(6,10,15,0.85)",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.24em",
            borderRadius: 999,
            pointerEvents: "none",
            animation: "flashPulse 0.9s ease-out",
          }}
        >
          {flashMessage}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          padding: "0 10px 24px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          background:
            "linear-gradient(0deg, rgba(6,10,15,0.97) 0%, rgba(6,10,15,0.58) 62%, transparent 100%)",
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
          pointerEvents: "none",
          touchAction: "pan-y",
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{
            width: 58,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            pointerEvents: "auto",
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenControlPanel(post.userEmail || post.id);
            }}
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: "1.5px solid rgba(245,197,24,0.45)",
              background: post.avatarUrl
                ? `url(${post.avatarUrl}) center/cover`
                : "linear-gradient(135deg, #1a2030, #0a0e18)",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "monospace",
              color: "#fff",
              letterSpacing: "0.04em",
              maxWidth: 58,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {post.handle ? `@${post.handle}` : "@user"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              color: GOLD,
              fontFamily: "monospace",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            <VoltageSpark size={10} />
            {tickedVoltage}
          </div>
          {post.isLive && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#ff2d55",
                  boxShadow: "0 0 6px rgba(255,45,85,0.8)",
                  animation: "feedLivePulse 1.2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color: "#ff2d55",
                  letterSpacing: "0.2em",
                }}
              >
                LIVE
              </span>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {trancheVisible && (
            <TrancheCard
              post={post}
              voltage={tickedVoltage}
              onDismiss={() => {
                dismissedTranches.add(trancheKey);
                setTrancheVisible(false);
                setTrancheDismissed(true);
              }}
            />
          )}
          <div style={{ position: "relative", maxHeight: 120 }}>
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 18,
                background:
                  "linear-gradient(180deg, rgba(6,10,15,1) 0%, transparent 100%)",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <div
              style={{
                maxHeight: 120,
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                padding: "8px 2px 0",
                fontSize: 11,
                lineHeight: 1.55,
                color: "rgba(255,255,255,0.86)",
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
              }}
              className="no-scrollbar"
            >
              {post.caption || ""}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            width: 120,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          <PeopleCylinder people={people} onOpen={onSelectPerson} />
          <div
            style={{
              width: "60%",
              height: 1,
              background: "rgba(255,255,255,0.06)",
            }}
          />
          <ActionCylinder
            keys={dmEnabled ? ACTION_KEYS : ACTION_KEYS.filter((k) => k !== "MESSAGE")}
            onAction={handleAction}
            liked={liked}
            giftPending={giftPending}
          />
        </div>
      </div>

      <style>{`
        @keyframes feedLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
        @keyframes flashPulse {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
          30% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.04); }
        }
        @keyframes giftPending {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  );
}

function TrancheCard({
  post,
  voltage,
  onDismiss,
}: {
  post: any;
  voltage: number;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        border: `1px solid ${GOLD}`,
        borderRadius: 12,
        padding: "8px 28px 8px 10px",
        background: "rgba(245,197,24,0.06)",
        boxShadow: "0 6px 24px rgba(245,197,24,0.18)",
        fontFamily: "monospace",
        animation: "trancheFade 240ms ease-out",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <VoltageSpark size={10} />
        <span style={{ fontSize: 8, color: GOLD, letterSpacing: "0.24em", fontWeight: 700 }}>
          TRANCHE
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9, color: GOLD, fontWeight: 700 }}>
          ⚡ {voltage}
        </span>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.86)",
          lineHeight: 1.5,
        }}
      >
        {(() => {
          // API returns latestComment as { id, body, userEmail } | null.
          const body =
            typeof post.latestComment === "string"
              ? post.latestComment
              : post.latestComment?.body;
          return body && body.length > 10
            ? body
            : "Voltage threshold reached — this post is trending.";
        })()}
      </div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
        @{post.handle ?? "user"}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss tranche"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <X size={12} />
      </button>
      <style>{`
        @keyframes trancheFade {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const PEOPLE_SIZES = [20, 26, 34, 26, 20];
const PEOPLE_OPACITIES = [0.35, 0.6, 1, 0.6, 0.35];

function PeopleCylinder({
  people,
  onOpen,
}: {
  people: PeopleCardUser[];
  onOpen: (p: PeopleCardUser) => void;
}) {
  const [index, setIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);

  const total = people.length;
  const visible = useMemo(() => {
    if (total === 0) return [];
    const out: (PeopleCardUser | null)[] = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const i = ((index + offset) % total + total) % total;
      out.push(people[i] ?? null);
    }
    return out;
  }, [people, index, total]);

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    // Tap (<=10px) — let the native click fire on the centre button.
    if (Math.abs(dx) <= 10 || total === 0) return;
    setIndex((i) => (i + (dx < 0 ? 1 : -1) + total) % total);
  };

  if (total === 0) {
    return (
      <div
        style={{
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.2em",
        }}
      >
        NO PEOPLE
      </div>
    );
  }

  const centre = visible[2];

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        height: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        userSelect: "none",
        touchAction: "pan-y",
      }}
    >
      {visible.map((p, i) => {
        const size = PEOPLE_SIZES[i];
        const opacity = PEOPLE_OPACITIES[i];
        const isCentre = i === 2;
        return (
          <button
            key={`${p?.handle ?? "empty"}-${i}`}
            onClick={() => {
              if (isCentre && p) {
                onOpen({
                  ...p,
                  mutuals: [{ handle: "aj" }, { handle: "ms" }],
                  recentLinkers: [
                    { handle: "kr" },
                    { handle: "tl" },
                    { handle: "yc" },
                  ],
                });
              }
            }}
            aria-label={isCentre && p ? `Open ${p.handle}` : undefined}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              padding: 0,
              border: isCentre
                ? `1.5px solid ${GOLD}`
                : "1px solid rgba(255,255,255,0.15)",
              background: p?.avatarUrl
                ? `url(${p.avatarUrl}) center/cover`
                : "linear-gradient(135deg, #1a2030, #0a0e18)",
              opacity,
              boxShadow: isCentre ? "0 0 12px rgba(245,197,24,0.55)" : "none",
              transition: "all 240ms ease",
              cursor: isCentre ? "pointer" : "default",
              flexShrink: 0,
            }}
          />
        );
      })}
      <span style={{ display: "none" }}>{centre?.handle}</span>
    </div>
  );
}

function ActionCylinder({
  keys,
  onAction,
  liked,
  giftPending,
}: {
  keys: readonly ActionKey[];
  onAction: (k: ActionKey) => void;
  liked: boolean;
  giftPending: boolean;
}) {
  const [index, setIndex] = useState(0);
  const total = keys.length;
  const touchStartRef = useRef<number | null>(null);

  // Keep the active index in range if the key set shrinks (e.g. DMs go dark).
  useEffect(() => {
    setIndex((i) => (i >= keys.length ? 0 : i));
  }, [keys.length]);

  const rotateBy = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + total) % total);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    touchStartRef.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (touchStartRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    // Tap (<=10px) — let the native click fire on the active button.
    if (Math.abs(dx) <= 10) return;
    rotateBy(dx < 0 ? 1 : -1);
  };

  const activeKey = keys[index];
  const { Icon: ActiveIcon, glow: activeGlow } = ACTION_ICONS[activeKey];
  const prevKey = keys[(index - 1 + total) % total];
  const nextKey = keys[(index + 1) % total];
  const { Icon: PrevIcon } = ACTION_ICONS[prevKey];
  const { Icon: NextIcon } = ACTION_ICONS[nextKey];

  const isLiked = liked && activeKey === "LIKE";
  const isGiftPending = giftPending && activeKey === "GIFT";

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        userSelect: "none",
        touchAction: "pan-y",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          height: 40,
          perspective: 200,
        }}
      >
        <button
          onClick={() => rotateBy(-1)}
          aria-label="Previous action"
          style={{
            background: "transparent",
            border: "none",
            padding: 2,
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <div
          style={{
            opacity: 0.28,
            transform: "rotateY(-55deg)",
            transformOrigin: "right center",
          }}
        >
          <PrevIcon size={20} color="rgba(255,255,255,0.85)" />
        </div>
        <button
          onClick={() => {
            if (isGiftPending) return;
            onAction(activeKey);
          }}
          aria-label={activeKey}
          aria-busy={isGiftPending}
          disabled={isGiftPending}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: isGiftPending ? "wait" : "pointer",
            display: "flex",
            transform: "rotateY(0deg)",
            transition: "transform 280ms cubic-bezier(0.4,0.8,0.2,1)",
            opacity: isGiftPending ? 0.4 : 1,
            filter: isLiked
              ? `drop-shadow(0 0 8px #ff4d6d)`
              : `drop-shadow(0 0 4px rgba(255,255,255,0.3))`,
            animation: isGiftPending
              ? "giftPending 1s ease-in-out infinite"
              : undefined,
          }}
          key={activeKey}
        >
          <ActiveIcon
            size={26}
            color={isLiked ? activeGlow : "#fff"}
            fill={isLiked ? activeGlow : "none"}
          />
        </button>
        <div
          style={{
            opacity: 0.28,
            transform: "rotateY(55deg)",
            transformOrigin: "left center",
          }}
        >
          <NextIcon size={20} color="rgba(255,255,255,0.85)" />
        </div>
        <button
          onClick={() => rotateBy(1)}
          aria-label="Next action"
          style={{
            background: "transparent",
            border: "none",
            padding: 2,
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
            display: "flex",
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {activeKey}
      </span>
    </div>
  );
}
