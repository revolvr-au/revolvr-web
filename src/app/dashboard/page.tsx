cat <<'EOF' > src/app/dashboard/page.tsx
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
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);

  // --- Stripe test tip handler ---
  async function handleTestTip() {
    if (!userEmail) {
      setError("You need to be logged in to tip.");
      return;
    }

    try {
      setIsStartingCheckout(true);
      setError(null);

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "tip",
          userEmail,
          amountCents: 200, // $2 AUD
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Checkout failed:", text);
        setError("Could not start payment. Try again.");
        return;
      }

      const data = (await res.json()) as { url?: string };

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Stripe did not return a checkout URL.");
      }
    } catch (err) {
      console.error("Error creating checkout:", err);
      setError("Revolvr glitched out starting Stripe checkout 😵‍💫");
    } finally {
      setIsStartingCheckout(false);
    }
  }

  // --- Load current user (redirect to /login if none) ---
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

  // --- Load posts ---
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

  // --- Sign out ---
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/feed");
  };

  // --- Create a post ---
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
      } = supabase.storage.from("posts").getPublicUrl(storageData.path);

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

  // --- Delete a post ---
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

  // --- Loading / not logged in states ---
  if (loadingUser) {
    return (
      <main className="rv-page rv-page-center min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="rv-feed-empty text-sm text-white/70">
          Loading Revolvr…
        </p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="rv-page rv-page-center min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="rv-feed-empty text-sm text-white/70">
          Redirecting to login…
        </p>
      </main>
    );
  }

  // --- Main UI ---
  return (
    <div className="rv-page min-h-screen bg-[#050816] text-white">
      {/* Top bar */}
      <header className="rv-topbar flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="rv-topbar-left flex items-center gap-2">
          <span className="rv-logo-text text-lg font-semibold tracking-tight">
            Revolvr
          </span>
          <span className="rv-logo-emoji">🔥</span>
        </div>

        <div className="rv-topbar-right flex items-center gap-3">
          <span className="rv-topbar-creator text-xs sm:text-sm text-white/80">
            {creatorLabel}
          </span>
          <a
            href="/public-feed"
            className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm transition"
          >
            Go to public feed
          </a>

          <button
            type="button"
            className="rv-pill-button rv-pill-secondary px-3 py-1 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="rv-main max-w-5xl mx-auto px-4 py-8">
        <div className="rv-feed-shell space-y-6">
          {/* Error banner */}
          {error && (
            <div className="rv-banner-error bg-red-500/10 border border-red-500/40 text-red-100 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
              <span>{error}</span>
              <button
                className="rv-banner-dismiss text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Header row */}
          <div className="rv-feed-header space-y-1">
            <div className="rv-feed-title-row flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h1 className="rv-feed-title text-2xl sm:text-3xl font-semibold">
                Live feed · PAYMENTS DEBUG
              </h1>
              <span className="rv-feed-version text-xs text-white/60">
                v0.1 · social preview · CREATOR VIEW
              </span>
            </div>
            <p className="rv-feed-subtitle text-sm text-white/70">
              Post from here. Everyone else can watch the chaos at{" "}
              <span className="rv-inline-link text-white">/feed</span>.
            </p>
          </div>

          {/* Composer + Stripe test button */}
          <div className="rv-composer-row flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="rv-primary-button inline-flex items-center justify-center rounded-full px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-sm font-medium shadow-lg shadow-emerald-500/25 transition"
              onClick={() => setIsComposerOpen(true)}
            >
              + New post
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-xs sm:text-sm font-medium shadow-md shadow-indigo-500/25 transition disabled:opacity-60"
              disabled={!userEmail || isStartingCheckout}
              onClick={handleTestTip}
            >
              {isStartingCheckout ? "Starting tip…" : "Test $2 tip (Stripe)"}
            </button>
          </div>

          {/* Posts */}
          {isLoadingPosts ? (
            <div className="rv-feed-empty text-sm text-white/70">
              Loading the feed…
            </div>
          ) : posts.length === 0 ? (
            <div className="rv-feed-empty text-sm text-white/70">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="rv-feed-list space-y-6 pb-12">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rv-card rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  <div className="rv-card-header flex items-center justify-between px-4 py-3">
                    <div className="rv-card-user flex items-center gap-3">
                      <div className="rv-avatar h-9 w-9 rounded-full bg-emerald-500/80 flex items-center justify-center text-sm font-semibold">
                        {(post.user_email ?? "R")[0].toUpperCase()}
                      </div>
                      <div className="rv-card-meta">
                        <span className="rv-card-email text-sm font-medium">
                          {post.user_email ?? "Someone"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rv-delete-link text-xs text-red-300 hover:text-red-200 underline"
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
                      className="rv-card-image w-full max-h-[480px] object-cover"
                    />
                  </div>

                  {post.caption && (
                    <p className="rv-card-caption px-4 py-3 text-sm text-white/90">
                      {post.caption}
                    </p>
                  )}

                  <div className="rv-card-reactions-row px-4 pb-3">
                    <div className="rv-emoji-row flex gap-2">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          className="rv-emoji-button inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-lg"
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
        <div className="rv-modal-backdrop fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="rv-modal w-full max-w-md rounded-2xl bg-[#050816] border border-white/15 shadow-2xl shadow-black/60">
            <div className="rv-modal-header flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="rv-modal-title text-base font-semibold">
                New post
              </h2>
              <button
                type="button"
                className="rv-modal-close text-sm text-white/60 hover:text-white"
                onClick={() => !isPosting && setIsComposerOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              className="rv-modal-body px-4 py-3 space-y-4"
              onSubmit={handleCreatePost}
            >
              <label className="rv-field-label text-sm font-medium space-y-1">
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="rv-input-file block w-full text-sm text-white/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-emerald-500 file:text-black hover:file:bg-emerald-400"
                />
              </label>

              <label className="rv-field-label text-sm font-medium space-y-1">
                <span>Caption</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="rv-input-textarea w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="Say something wild…"
                />
              </label>

              <div className="rv-modal-footer flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rv-pill-button rv-pill-secondary px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
                  onClick={() => !isPosting && setIsComposerOpen(false)}
                  disabled={isPosting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rv-primary-button inline-flex items-center justify-center rounded-full px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium shadow-md shadow-emerald-500/25 transition disabled:opacity-60"
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
EOF
