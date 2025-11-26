"use client";

import { supabase } from "@/app/lib/supabaseClients";
import React, { useEffect, useMemo, useState } from "react";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  reactions?: Record<string, number>;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"];

export default function PublicFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load posts from Supabase (no auth required to view)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from("posts")
          .select("id, user_email, image_url, caption, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPosts(
          (data ?? []).map((row: any) => ({
            id: row.id,
            user_email: row.user_email,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            reactions: {},
          }))
        );
      } catch (e) {
        console.error("Error loading public feed", e);
        setError("Revolvr glitched out loading the public feed 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleReact = (postId: string, emoji: string) => {
    // Local-only reactions for now (no persistence)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...(p.reactions ?? {}),
                [emoji]: (p.reactions?.[emoji] ?? 0) + 1,
              },
            }
          : p
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">
            Revolvr
          </span>
          <span className="text-lg">🔥</span>
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-white/70">
          <a
            href="/login"
            className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs"
          >
            Sign in
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 sm:px-0 py-4 space-y-3">
          {/* Error banner */}
          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mt-1 mb-1">
            <h1 className="text-base font-semibold text-white/90">
              Public feed
            </h1>
            <span className="text-xs text-white/50">
              v0.1 · social preview
            </span>
          </div>

          <p className="text-xs text-white/50">
            Anyone can watch this. Want to post? Sign in and head to your
            dashboard.
          </p>

          {/* Feed body */}
          {isLoading ? (
            <div className="text-center text-sm text-white/60 py-10">
              Loading the chaos…
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-sm text-white/60 py-10">
              No posts yet. Check back soon ✨
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {posts.map((post) => (
                <PublicPostCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

type PublicPostCardProps = {
  post: Post;
  onReact: (postId: string, emoji: string) => void;
};

const PublicPostCard: React.FC<PublicPostCardProps> = ({ post, onReact }) => {
  const [hasMounted, setHasMounted] = useState(false);

  const animationClass = useMemo(() => {
    const classes = [
      "rv-spin-in",
      "rv-bounce-in",
      "rv-jolt-in",
      "rv-glitch-in",
      "rv-slide-in",
    ];
    const random = Math.floor(Math.random() * classes.length);
    return classes[random];
  }, []);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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

  return (
    <article className="rounded-2xl bg-slate-950/40 border border-white/10 p-3 sm:p-4 shadow-md shadow-black/40">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
            {post.user_email?.[0] ?? "R"}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-[220px]">
              {post.user_email ?? "Someone"}
            </span>
            <span className="text-[11px] text-white/40">{timeLabel}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      <div
        className={`overflow-hidden rounded-xl bg-black/40 ${
          hasMounted ? animationClass : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_url}
          alt={post.caption}
          className="w-full h-auto block"
        />
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="mt-2 text-sm text-white/90 break-words">
          {post.caption}
        </p>
      )}

      {/* Reactions (local only) */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {REACTION_EMOJIS.map((emoji) => {
            const count = post.reactions?.[emoji] ?? 0;
            return (
              <button
                key={emoji}
                onClick={() => onReact(post.id, emoji)}
                className="rv-emoji-button text-lg leading-none"
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="ml-1 text-[11px] text-white/60">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};
