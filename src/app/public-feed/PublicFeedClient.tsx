"use client";

import { useEffect, useMemo, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { PersonRailItem } from "@/components/PeopleRail";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";
import { Heart, MessageCircle, Share2, Gift } from "lucide-react";


type ApiPost = {
  id: string;
  userEmail: string | null;
  imageUrl: string | null;
  caption: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
};

export function PublicFeedClient() {
  const [posts, setPosts] = useState<ApiPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});

  const viewer = "test@revolvr.net";

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
        handle: displayNameFromEmail(email).toLowerCase(),
        imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
        displayName: displayNameFromEmail(email),
      });

      if (out.length >= 20) break;
    }

    return out;
  }, [posts]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/posts?userEmail=${viewer}`);
        const json = await res.json();
        const incoming: ApiPost[] = json?.posts ?? [];

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
        setErr("Failed to load feed.");
      } finally {
        setLoading(false);
      }
    }

    load();
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

  function onToggleFollow(email: string) {
    setFollowMap((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  }

  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <PeopleRail
        items={railItems}
        onToggleFollow={onToggleFollow}
        followMap={followMap}
      />

      {loading && <div className="p-4 opacity-70">Loading…</div>}
      {err && <div className="p-4 text-red-400">{err}</div>}

      {!loading &&
  posts.map((p) => {
    const email = String(p.userEmail || "").trim().toLowerCase();
    const display = email
      ? displayNameFromEmail(email)
      : "User";

    const url = p.imageUrl || "";
    const isVideo =
      url.endsWith(".mov") ||
      url.endsWith(".mp4") ||
      url.endsWith(".webm");

    return (
      <div key={p.id} className="p-4">

        {/* HEADER */}
        <div className="mb-2">
          <div className="text-sm font-semibold text-white">
            {display}
          </div>
          {email && (
            <div className="text-xs text-white/40">
              @{email.split("@")[0]}
            </div>
          )}
        </div>

        {/* MEDIA + OVERLAY */}
        <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 bg-black/20">

          {/* MEDIA */}
          {url ? (
            isVideo ? (
              <video
                src={url}
                controls
                className="w-full h-auto block"
              />
            ) : (
              <img
                src={url}
                alt="Post media"
                className="w-full h-auto block object-cover"
              />
            )
          ) : (
            <div className="p-6 text-sm opacity-70">
              No media.
            </div>
          )}

          {/* LEFT LOWER REWARDS */}
          <button
            type="button"
            className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-2 text-xs text-white shadow hover:bg-black/70"
          >
            <Gift size={16} />
            Rewards
          </button>

          {/* RIGHT LOWER ACTIONS */}
          <div className="absolute right-3 bottom-3 flex flex-col items-center gap-4">

            {/* LIKE */}
            <button
              type="button"
              onClick={() => toggleLike(p.id)}
              className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
            >
              <Heart
                size={24}
                className={
                  likedMap[p.id]
                    ? "fill-red-500 text-red-500"
                    : ""
                }
              />
              <span className="text-[11px]">
                {likeCounts[p.id] ?? 0}
              </span>
            </button>

            {/* COMMENT */}
            <button
              type="button"
              className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
            >
              <MessageCircle size={24} />
              <span className="text-[11px]">0</span>
            </button>

            {/* SHARE */}
            <button
              type="button"
              className="flex flex-col items-center gap-1 text-white/90 hover:text-white"
            >
              <Share2 size={24} />
              <span className="text-[11px]">Share</span>
            </button>

          </div>
        </div>

        {/* CAPTION */}
        {p.caption && (
          <div className="mt-3 text-sm text-white/90">
            {p.caption}
          </div>
        )}

      </div>
    );
  })}
