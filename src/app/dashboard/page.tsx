"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"];

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Load current user (redirect to /login if none)
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoadingUser(true);
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;

        if (!user || !user.email) {
          router.replace("/login");
          return;
        }

        setUserEmail(user.email);
      } catch (e) {
        console.error("Error loading user", e);
        setError("Revolvr glitched out checking your session 😵‍💫");
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, [router]);

  // Load posts (all posts for now – RLS protects insert per-user)
  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const { data, error } = await supabase
        .from("posts")
        .select("id, user_email, image_url, caption, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts(data ?? []);
    } catch (e) {
      console.error("Error loading posts", e);
      setError("Revolvr glitched out while loading the feed 😵‍💫");
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      loadPosts();
    }
  }, [userEmail, loadPosts]);

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/feed");
  };

  // Create a post
  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!userEmail) return;
    if (!file) {
      setError("Please add a photo before posting.");
      return;
    }

    try {
      setIsPosting(true);
      setError(null);

      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExt}`;

      const { data: storageData, error: storageError } =
        await supabase.storage.from("posts").upload(filePath, file);

      if (storageError || !storageData) {
        throw storageError ?? new Error("Upload failed");
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("posts")
        .getPublicUrl(storageData.path);

      const { data: inserted, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_email: userEmail,
          image_url: publicUrl,
          caption: caption.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setPosts((prev) => (inserted ? [inserted as Post, ...prev] : prev));
      setCaption("");
      setFile(null);
      setIsComposerOpen(false);
    } catch (e) {
      console.error("Error creating post", e);
      setError("Revolvr glitched out while posting 😵‍💫 Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Delete a post
  const handleDeletePost = async (id: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Error deleting post", e);
      setError("Revolvr glitched out while deleting that post 😵‍💫");
    }
  };

  const creatorLabel = useMemo(() => {
    if (!userEmail) return "Creator view";
    return `${userEmail}`;
  }, [userEmail]);

  if (loadingUser) {
    return (
      <main className="rv-page rv-page-center">
        <p className="rv-feed-empty">Loading Revolvr…</p>
      </main>
    );
  }

  if (!userEmail) {
    // Redirect is already in motion, just render nothing pretty
    return (
      <main className="rv-page rv-page-center">
        <p className="rv-feed-empty">Redirecting to login…</p>
      </main>
    );
  }

  return (
    <div className="rv-page">
      {/* Top bar */}
      <header className="rv-topbar">
        <div className="rv-topbar-left">
          <span className="rv-logo-text">Revolvr</span>
          <span className="rv-logo-emoji">🔥</span>
        </div>

        <div className="rv-topbar-right">
          <span className="rv-topbar-creator">{creatorLabel}</span>
          <a
  href="/public-feed"
  className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm transition"
>
  Go to public feed
</a>

          <button
            type="button"
            className="rv-pill-button rv-pill-secondary"
            onClick={handleSignOut}
          >
            Sign out
          </button>
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

          {/* Header row */}
          <div className="rv-feed-header">
            <div className="rv-feed-title-row">
              <h1 className="rv-feed-title">Live feed</h1>
              <span className="rv-feed-version">
                v0.1 · social preview · CREATOR VIEW
              </span>
            </div>
            <p className="rv-feed-subtitle">
              Post from here. Everyone else can watch the chaos at{" "}
              <span className="rv-inline-link">/feed</span>.
            </p>
          </div>

          {/* Composer button */}
          <div className="rv-composer-row">
            <button
              type="button"
              className="rv-primary-button"
              onClick={() => setIsComposerOpen(true)}
            >
              + New post
            </button>
          </div>

          {/* Posts */}
          {isLoadingPosts ? (
            <div className="rv-feed-empty">Loading the feed…</div>
          ) : posts.length === 0 ? (
            <div className="rv-feed-empty">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="rv-feed-list">
              {posts.map((post) => (
                <article key={post.id} className="rv-card">
                  <div className="rv-card-header">
                    <div className="rv-card-user">
                      <div className="rv-avatar">
                        {(post.user_email ?? "R")[0].toUpperCase()}
                      </div>
                      <div className="rv-card-meta">
                        <span className="rv-card-email">
                          {post.user_email ?? "Someone"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rv-delete-link"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="rv-card-image-shell rv-slide-in">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="rv-card-image"
                    />
                  </div>

                  {post.caption && (
                    <p className="rv-card-caption">{post.caption}</p>
                  )}

                  <div className="rv-card-reactions-row">
                    <div className="rv-emoji-row">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="rv-emoji-button"
                          type="button"
                        >
                          <span>{emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Composer modal */}
      {isComposerOpen && (
        <div className="rv-modal-backdrop">
          <div className="rv-modal">
            <div className="rv-modal-header">
              <h2 className="rv-modal-title">New post</h2>
              <button
                type="button"
                className="rv-modal-close"
                onClick={() => !isPosting && setIsComposerOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="rv-modal-body" onSubmit={handleCreatePost}>
              <label className="rv-field-label">
                Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="rv-input-file"
                />
              </label>

              <label className="rv-field-label">
                Caption
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="rv-input-textarea"
                  placeholder="Say something wild…"
                />
              </label>

              <div className="rv-modal-footer">
                <button
                  type="button"
                  className="rv-pill-button rv-pill-secondary"
                  onClick={() => !isPosting && setIsComposerOpen(false)}
                  disabled={isPosting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rv-primary-button"
                  disabled={isPosting}
                >
                  {isPosting ? "Posting…" : "Post to Revolvr"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
