"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  reactions?: Record<string, number>;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "��", "🥴"];

export default function PublicFeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load posts from Supabase (no auth required to view)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
    // Local-only reactions
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
    <div className="rv-page">
      {/* Top bar */}
      <header className="rv-topbar">
        <div className="rv-topbar-left">
          <span className="rv-logo-text">Revolvr</span>
          <span className="rv-logo-emoji">🔥</span>
        </div>
        <div className="rv-topbar-right">
          <a href="/login" className="rv-pill-button rv-pill-secondary">
            Sign in
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="rv-main">
        <div className="rv-feed-shell">
          {/* Error banner */}
          {error && (
            <div className="rv-banner-error">
              <span>{error}</span>
              <button
                className="rv-banner-dismiss"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header */}
          <div className="rv-feed-header">
            <div className="rv-feed-title-row">
              <h1 className="rv-feed-title">Public feed</h1>
              <span className="rv-feed-version">v0.1 · social preview</span>
            </div>
            <p className="rv-feed-subtitle">
              Anyone can watch this. Want to post? Sign in and head to your
              dashboard.
            </p>
          </div>

          {/* Feed body */}
          {isLoading ? (
            <div className="rv-feed-empty">Loading the chaos…</div>
          ) : posts.length === 0 ? (
            <div className="rv-feed-empty">
              No posts yet. Check back soon ✨
            </div>
          ) : (
            <div className="rv-feed-list">
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
    <article className="rv-card">
      {/* Header */}
      <div className="rv-card-header">
        <div className="rv-card-user">
          <div className="rv-avatar">
            {(post.user_email ?? "R")[0].toUpperCase()}
          </div>
          <div className="rv-card-meta">
            <span className="rv-card-email">{post.user_email ?? "Someone"}</span>
            <span className="rv-card-time">{timeLabel}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      <div
        className={`rv-card-image-shell ${
          hasMounted ? animationClass : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_url}
          alt={post.caption}
          className="rv-card-image"
        />
      </div>

      {/* Caption */}
      {post.caption && (
        <p className="rv-card-caption">{post.caption}</p>
      )}

      {/* Reactions (local only) */}
      <div className="rv-card-reactions-row">
        <div className="rv-emoji-row">
          {REACTION_EMOJIS.map((emoji) => {
            const count = post.reactions?.[emoji] ?? 0;
            return (
              <button
                key={emoji}
                onClick={() => onReact(post.id, emoji)}
                className="rv-emoji-button"
                type="button"
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="rv-emoji-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
};
