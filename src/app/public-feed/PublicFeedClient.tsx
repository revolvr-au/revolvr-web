"use client";

import { useRouter } from "next/navigation";
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
  const [liveRoom, setLiveRoom] = useState<string | null>(null);
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [liveRole, setLiveRole] = useState<"host" | "viewer">("viewer");
  const router = useRouter();

  // 🔴 LIVE STATE (cleaned)
 

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

    const handle = displayNameFromEmail(email)
      .toLowerCase()
      .replace(/\s+/g, "");

    out.push({
      id: email,
      email,
      handle,
      imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
      displayName: displayNameFromEmail(email),
      tick: null,
      isLive:
        liveData &&
        liveData.creatorName.toLowerCase() === handle,
    });

    if (out.length >= 20) break;
  }

  return out;
}, [posts, liveData]);

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
    onGoLive={() =>
      router.push(`/live/revolvr-global?role=host`)
    }
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
          onJoin={(id) =>
            router.push(
              `/live/${id}?creator=${liveData?.creatorName}`
            )
          }
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
  </FeedLayout>
);
}