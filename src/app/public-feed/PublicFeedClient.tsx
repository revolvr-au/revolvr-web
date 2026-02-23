"use client";

import { useEffect, useMemo, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { PersonRailItem } from "@/components/PeopleRail";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift } from "lucide-react";
import LiveCard from "@/components/LiveCard";

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

  // 🔴 LIVE STATE (cleaned)
  const [liveStage, setLiveStage] = useState<"idle" | "live">("idle");

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardPostId, setRewardPostId] = useState<string | null>(null);

  const viewer = "test@revolvr.net";

  const rewardItems: Array<{ mode: RewardMode; label: string; icon: string }> = [
    { mode: "applause", label: "Applause", icon: "👏" },
    { mode: "fire", label: "Fire", icon: "🔥" },
    { mode: "love", label: "Love", icon: "❤️" },
    { mode: "respect", label: "Respect", icon: "🫡" },
  ];

  const [liveData, setLiveData] = useState<null | {
    sessionId: string;
    creatorName: string;
  }>(null);

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

  // Load posts
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          "/api/posts?userEmail=" + encodeURIComponent(viewer),
          { cache: "no-store" }
        );
        const json = await res.json();

        if (!res.ok) {
          if (!cancelled) {
            setErr("Failed to load feed.");
            setPosts([]);
          }
          return;
        }

        const incoming: ApiPost[] = Array.isArray(json?.posts)
          ? json.posts
          : [];

        if (cancelled) return;

        setPosts(incoming);

        const nextLiked: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};
        for (const p of incoming) {
          nextLiked[p.id] = Boolean(p.likedByCurrentUser);
          nextCounts[p.id] = p.likeCount ?? 0;
        }

        setLikedMap(nextLiked);
        setLikeCounts(nextCounts);
      } catch {
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

  // Fetch active live session
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch("/api/live/active");
        const data = await res.json();

        if (data.isLive) {
          setLiveData({
            sessionId: data.sessionId,
            creatorName: data.creatorName,
          });
        } else {
          setLiveData(null);
        }
      } catch {
        setLiveData(null);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 15000);
    return () => clearInterval(interval);
  }, []);

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
    <FeedLayout
      title="REVOLVR"
      onGoLive={() => setLiveStage("live")} // 🔴 ONE TAP LIVE
    >
      <div className="px-4 pt-4">
        <PeopleRail
          items={railItems}
          onToggleFollow={() => {}}
          followMap={{}}
        />
      </div>

      {liveData && (
        <div className="px-4">
          <LiveCard
  creatorName={liveData.creatorName}
  sessionId={liveData.sessionId}
  onJoin={(id) => {
    setLiveStage("live");
  }}
/>
        </div>
      )}

      {loading && <div className="p-4 opacity-70">Loading…</div>}
      {err && <div className="p-4 text-red-400">{err}</div>}

      {!loading &&
        !err &&
        posts.map((p) => {
          const email = String(p.userEmail || "").trim().toLowerCase();
          const display = email
            ? displayNameFromEmail(email)
            : "User";

          const mediaUrl = String(p.imageUrl || "").trim();
          const isVideo =
            mediaUrl.endsWith(".mp4") ||
            mediaUrl.endsWith(".webm");

          return (
            <div key={p.id} className="p-4">
              <div className="text-sm font-semibold text-white">
                {display}
              </div>

              <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/20">
                {mediaUrl ? (
                  isVideo ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt=""
                      className="w-full object-cover"
                    />
                  )
                ) : null}

                <div className="absolute right-4 bottom-6 flex flex-col gap-5">
                  <button
                    onClick={() => toggleLike(p.id)}
                    className="flex flex-col items-center"
                  >
                    <Heart
                      size={26}
                      className={
                        likedMap[p.id]
                          ? "fill-red-500 text-red-500"
                          : ""
                      }
                    />
                    <span className="text-xs">
                      {likeCounts[p.id] ?? 0}
                    </span>
                  </button>

                  <button
                    onClick={() => openComments(p.id)}
                    className="flex flex-col items-center"
                  >
                    <MessageCircle size={26} />
                  </button>

                  <button className="flex flex-col items-center">
                    <Share2 size={26} />
                  </button>
                </div>
              </div>

              {p.caption && (
                <div className="mt-3 text-sm text-white/90">
                  {p.caption}
                </div>
              )}
            </div>
          );
        })}

     {/* 🔴 FULLSCREEN LIVE OVERLAY */}
        {liveStage === "live" && (
  <div className="fixed inset-0 z-50 bg-black overflow-hidden">

    {/* Ambient Glow */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,60,0.18),transparent_60%)] pointer-events-none" />

    {/* Header */}
    <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
        <span className="text-white font-semibold tracking-widest text-sm">
          LIVE
        </span>
        <span className="text-white/60 text-sm ml-3">
          128 watching
        </span>
      </div>

      <button
        onClick={() => setLiveStage("idle")}
        className="px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white text-sm hover:bg-white/20 transition"
      >
        Exit
      </button>
    </div>

    {/* Stream Area */}
    <div className="flex items-center justify-center h-full text-white/80 text-xl">
      Live Stream Running
    </div>

    {/* Bottom Interaction Bar */}
    <div className="absolute bottom-6 left-6 right-6 z-20 flex items-center gap-3">
      <input
        placeholder="Say something..."
        className="flex-1 h-12 rounded-full bg-white/10 backdrop-blur px-4 text-white placeholder:text-white/40 outline-none"
      />

      <button className="h-12 w-12 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_25px_rgba(255,0,60,0.6)]">
        ❤️
      </button>
    </div>

  </div>
)}
    </FeedLayout>
  );
}