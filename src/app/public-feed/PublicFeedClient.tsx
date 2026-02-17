"use client";

import { useEffect, useMemo, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import { MediaCarousel } from "@/components/media/MediaCarousel";
import { isValidImageUrl, displayNameFromEmail } from "@/utils/imageUtils";

type ApiPost = {
  id: string;
  userEmail: string | null;
  imageUrl: string | null;
  caption: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  likeCount: number;
  likedByCurrentUser: boolean;
};

export function PublicFeedClient() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [brokenMedia, setBrokenMedia] = useState<Record<string, boolean>>({});

  // Temporary until auth wiring
  const viewerEmail = "test@revolvr.net";
  const viewer = viewerEmail.trim().toLowerCase();

  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [followBusy, setFollowBusy] = useState<Record<string, boolean>>({});

  const mockPeople: PersonRailItem[] = [
    { email: "singaporeair@revolvr.net", tick: "gold", isLive: true },
    { email: "mangusta@yachts.com", tick: "blue", isLive: false },
    { email: "feadship@revolvr.net", tick: null, isLive: true },
  ];

  const railItems = useMemo<PersonRailItem[]>(() => {
    if (posts.length === 0) return mockPeople;

    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);

      const img = String(p.imageUrl || "");
      out.push({
        email,
        imageUrl: isValidImageUrl(img) ? img : null,
        displayName: displayNameFromEmail(email),
        tick: null, // not returned by API yet
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

        const res = await fetch(`/api/posts?userEmail=${encodeURIComponent(viewer)}`, {
          cache: "no-store",
        });

        const json = (await res.json().catch(() => null)) as any;

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

        const incomingPosts: ApiPost[] = Array.isArray(json?.posts) ? json.posts : [];

        if (cancelled) return;

        setPosts(incomingPosts);

        // seed UI state from server truth
        const nextLiked: Record<string, boolean> = {};
        const nextCounts: Record<string, number> = {};

        for (const p of incomingPosts) {
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

    // UI-only for now (no API call yet)
  }

  function onToggleFollow(email: string) {
    const key = email.trim().toLowerCase();
    setFollowMap((prev) => ({ ...prev, [key]: !prev[key] }));
    // UI-only for now
  }

  return (
  <FeedLayout title="Revolvr" subtitle="Public feed">
    <div className="px-4 pt-4">
      <PeopleRail
        items={railItems}
        onToggleFollow={onToggleFollow}
        followMap={followMap}
        followBusy={followBusy}
      />
    </div>

    {loading && <div className="p-4 opacity-70">Loading…</div>}
    {err && <div className="p-4 text-red-400">{err}</div>}

    {!loading && !err && posts.length === 0 && (
      <div className="p-4 opacity-70">No posts yet.</div>
    )}

    {!loading && !err && posts.length > 0 && (
      <div>
        {posts.map((p) => {
          const url = String(p.imageUrl || "").trim();
          const lower = url.toLowerCase();
          const isVideo =
            lower.endsWith(".mov") ||
            lower.endsWith(".mp4") ||
            lower.endsWith(".webm");

          const broken = brokenMedia[p.id] === true;

          return (
            <div key={p.id} className="p-4">
              <div className="text-sm opacity-70">{p.userEmail}</div>

              {url && !broken ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {isVideo ? (
                    <video
                      src={url}
                      controls
                      playsInline
                      preload="metadata"
                      className="block w-full h-auto"
                      onError={() =>
                        setBrokenMedia((m) => ({ ...m, [p.id]: true }))
                      }
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={p.caption ?? "Post media"}
                      className="block w-full h-auto"
                      loading="lazy"
                      onError={() =>
                        setBrokenMedia((m) => ({ ...m, [p.id]: true }))
                      }
                    />
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm opacity-70">No media.</div>
              )}

              {p.caption && <div className="mt-2">{p.caption}</div>}

              <div className="mt-3 flex items-center gap-3 text-sm opacity-80">
                <button
                  type="button"
                  className="rounded px-2 py-1 hover:bg-white/5"
                  onClick={() => toggleLike(p.id)}
                >
                  {likedMap[p.id] ? "♥" : "♡"} {likeCounts[p.id] ?? 0}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </FeedLayout>
);
}
