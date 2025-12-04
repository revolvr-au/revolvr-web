"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  tip_count?: number;
  boost_count?: number;
  spin_count?: number;
};

export default function UserProfilePage({
  params,
}: {
  params: { email: string };
}) {
  const decodedEmail = decodeURIComponent(params.email);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, user_email, image_url, caption, created_at, tip_count, boost_count, spin_count"
        )
        .eq("user_email", decodedEmail)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPosts(
          data.map((row: any) => ({
            id: row.id,
            user_email: row.user_email,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            tip_count: row.tip_count ?? 0,
            boost_count: row.boost_count ?? 0,
            spin_count: row.spin_count ?? 0,
          }))
        );
      }

      setLoading(false);
    };

    load();
  }, [decodedEmail]);

  const totalTips = useMemo(
    () => posts.reduce((n, p) => n + (p.tip_count ?? 0), 0),
    [posts]
  );
  const totalBoosts = useMemo(
    () => posts.reduce((n, p) => n + (p.boost_count ?? 0), 0),
    [posts]
  );
  const totalSpins = useMemo(
    () => posts.reduce((n, p) => n + (p.spin_count ?? 0), 0),
    [posts]
  );

  const displayName = useMemo(() => {
    const [localPart] = decodedEmail.split("@");
    const cleaned = localPart.replace(/\W+/g, " ").trim();
    return cleaned || decodedEmail;
  }, [decodedEmail]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/public-feed"
            className="text-xs text-white/60 hover:text-white"
          >
            ← Back to feed
          </Link>
        </div>
      </header>

      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 sm:px-0 py-4 space-y-6">
          {/* Header */}
          <section className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl font-semibold uppercase">
              {displayName[0] ?? "U"}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{displayName}</h1>
              <p className="text-xs text-white/50">{decodedEmail}</p>
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/5 rounded-xl py-3">
              <div className="text-lg font-semibold">{posts.length}</div>
              <div className="text-white/50">Posts</div>
            </div>
            <div className="bg-white/5 rounded-xl py-3">
              <div className="text-lg font-semibold">{totalTips}</div>
              <div className="text-white/50">Tips</div>
            </div>
            <div className="bg-white/5 rounded-xl py-3">
              <div className="text-lg font-semibold">{totalBoosts}</div>
              <div className="text-white/50">Boosts</div>
            </div>
          </section>

          {/* Posts */}
          <section className="space-y-4 pb-20">
            {loading ? (
              <div className="text-center text-sm text-white/60">
                Loading posts…
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center text-sm text-white/60">
                No posts yet from this creator.
              </div>
            ) : (
              posts.map((post) => <ProfilePostCard key={post.id} post={post} />)
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ProfilePostCard({ post }: { post: Post }) {
  const created = new Date(post.created_at);

  const timeLabel = useMemo(() => {
    const seconds = Math.floor((Date.now() - created.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return created.toLocaleDateString();
  }, [created]);

  const isVideo = !!post.image_url?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <article className="rounded-2xl bg-[#070b1b] border border-white/10 p-3 sm:p-4 shadow-md shadow-black/30">
      <div className="text-[11px] text-white/40 mb-1">{timeLabel}</div>

      <div className="overflow-hidden rounded-xl bg-black/40">
        {isVideo ? (
          <video
            src={post.image_url}
            className="w-full h-auto block"
            controls
            playsInline
          />
        ) : (
          <img
            src={post.image_url}
            alt={post.caption}
            className="w-full h-auto block"
          />
        )}
      </div>

      {post.caption && (
        <p className="mt-2 text-sm text-white/90 break-words">{post.caption}</p>
      )}
    </article>
  );
}
