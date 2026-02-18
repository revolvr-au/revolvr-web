"use client";

import { useEffect, useMemo, useState } from "react";
import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { PersonRailItem } from "@/components/PeopleRail";
import { displayNameFromEmail, isValidImageUrl } from "@/utils/imageUtils";

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
              <div className="text-sm opacity-70">{display}</div>

              {url ? (
                <div className="mt-3 rounded-2xl overflow-hidden border border-white/10">
                  {isVideo ? (
                    <video
                      src={url}
                      controls
                      className="w-full"
                    />
                  ) : (
                    <img
                      src={url}
                      alt="Post media"
                      className="w-full"
                    />
                  )}
                </div>
              ) : (
                <div className="mt-2 text-sm opacity-70">
                  No media.
                </div>
              )}

              {p.caption && (
                <div className="mt-2">{p.caption}</div>
              )}

              <button
                onClick={() => toggleLike(p.id)}
                className="mt-2 text-sm"
              >
                {likedMap[p.id] ? "♥" : "♡"}{" "}
                {likeCounts[p.id] ?? 0}
              </button>
            </div>
          );
        })}
    </FeedLayout>
  );
}
