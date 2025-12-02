"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import SpinButton from "./_spinButton";
import IdentityLens from "@/components/IdentityLens";
import { RevolvrIcon } from "@/components/RevolvrIcon";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  is_boosted?: boolean | null;
  boost_expires_at?: string | null;
};

type Spin = {
  id: number;
  user_email: string;
  post_id: string | null;
  created_at: string;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"] as const;


const REACTIONS = [
  { icon: "heart" as const, label: "Love" },
  { icon: "tip" as const, label: "Tip" },
  { icon: "boost" as const, label: "Boost" },
];

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [posts, setPosts] = useState<Post[]>([]);
  const [spins, setSpins] = useState<Spin[]>([]);

  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingSpins, setIsLoadingSpins] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [isLensOpen, setIsLensOpen] = useState(false);

  // Load current user
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

  // Load posts
  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, user_email, image_url, caption, created_at, is_boosted, boost_expires_at"
        )
        .order("is_boosted", { ascending: false })
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

  // Load spins
  const loadSpins = useCallback(
    async (email: string) => {
      try {
        setIsLoadingSpins(true);

        const { data, error } = await supabase
          .from("spinner_spins")
          .select("*")
          .eq("user_email", email)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setSpins(data ?? []);
      } catch (e) {
        console.error("Error loading spins", e);
      } finally {
        setIsLoadingSpins(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!userEmail) return;
    loadPosts();
    loadSpins(userEmail);
  }, [userEmail, loadPosts, loadSpins]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/public-feed");
  };

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

  const handleBoostPost = async (postId: string, boostAmountCents = 500) => {
    if (!userEmail) {
      setError("You need to be logged in to boost a post.");
      return;
    }

    try {
      setError(null);

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "boost",
          userEmail,
          amountCents: boostAmountCents,
          postId,
        }),
      });

      if (!res.ok) {
        console.error("Boost checkout failed", await res.text());
        setError("Could not start boost payment. Try again.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Stripe did not return a checkout URL for boost.");
      }
    } catch (err) {
      console.error("Error creating boost checkout:", err);
      setError("Revolvr glitched out starting a boost 😵‍💫");
    }
  };

  const creatorLabel = useMemo(() => {
    if (!userEmail) return "Creator view";
    return userEmail;
  }, [userEmail]);

  if (loadingUser) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Loading Revolvr…</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">Redirecting to login…</p>
      </main>
    );
  }

  const avatarInitial = userEmail[0]?.toUpperCase() ?? "R";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <RevolvrIcon
            name="boost"
            size={20}
            className="hidden sm:block"
            alt="Revolvr"
          />
          <span className="text-lg font-semibold tracking-tight">Revolvr</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-white/50">
            {creatorLabel}
          </span>
          <button
            onClick={() => setIsLensOpen(true)}
            className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-black"
          >
            {avatarInitial}
          </button>
          <a
            href="/public-feed"
            className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm transition inline-flex items-center gap-1"
          >
            <RevolvrIcon name="share" size={14} />
            <span>Public feed</span>
          </a>
          <button
            className="px-3 py-1 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main 2-column layout */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Left rail – creator summary */}
        <aside className="hidden md:flex w-64 flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <RevolvrIcon name="analytics" size={18} />
              <h2 className="text-sm font-semibold">Creator dashboard</h2>
            </div>
            <p className="text-xs text-white/60">
              Post from here. Everyone else watches the chaos on the public
              feed.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsComposerOpen(true)}
                className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-medium shadow-lg shadow-emerald-500/25 transition gap-2"
              >
                <RevolvrIcon name="add" size={14} />
                <span>New post</span>
              </button>
              <SpinButton userEmail={userEmail} />
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2 text-xs text-white/60">
            <div className="flex items-center gap-2 text-sm font-medium text-white/80">
              <RevolvrIcon name="analytics" size={16} />
              <span>Your Spin History</span>
            </div>
            {isLoadingSpins ? (
              <p>Loading spins…</p>
            ) : spins.length === 0 ? (
              <p>No spins yet. Spin the Revolvr above!</p>
            ) : (
              <ul className="space-y-2">
                {spins.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="border border-white/10 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/80 text-xs">
                        Spin #{s.id}
                      </span>
                      <span className="text-[10px] text-white/50">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/55 mt-0.5">
                      {s.post_id ? `Reward: post ${s.post_id}` : "No reward"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* Center column – feed */}
        <section className="flex-1 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-100 px-4 py-2 rounded-lg flex items-center justify-between text-sm">
              <span>{error}</span>
              <button
                className="text-xs underline"
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Mobile composer row */}
          <div className="md:hidden flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Creator dashboard</h1>
              <span className="text-[11px] text-white/50">v0.1 • preview</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-medium shadow-lg shadow-emerald-500/25 transition gap-2"
                onClick={() => setIsComposerOpen(true)}
              >
                <RevolvrIcon name="add" size={14} />
                <span>New post</span>
              </button>

              <button
                className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-xs font-medium shadow-md shadow-indigo-500/25 transition disabled:opacity-60 gap-2"
                disabled={!userEmail}
                onClick={async () => {
                  const res = await fetch("/api/payments/checkout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      mode: "tip",
                      userEmail,
                      amountCents: 200,
                    }),
                  });
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                }}
              >
                <RevolvrIcon name="tip" size={14} />
                <span>Test $2 tip</span>
              </button>

              <SpinButton userEmail={userEmail} />
            </div>
          </div>

          {/* Posts */}
          {isLoadingPosts ? (
            <div className="text-sm text-white/70">Loading the feed…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-white/70">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="space-y-6 pb-12">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-emerald-500/80 flex items-center justify-center text-sm font-semibold">
                        {(post.user_email ?? "R")[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {post.user_email ?? "Someone"}
                        </span>
                        <span className="text-[11px] text-white/50">
                          {new Date(post.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-xs sm:text-sm px-3 py-1 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm shadow-indigo-500/30 inline-flex items-center gap-1.5"
                        onClick={() => handleBoostPost(post.id, 500)}
                      >
                        <RevolvrIcon name="boost" size={14} />
                        <span>Boost (A$5)</span>
                      </button>
                      <button
                        className="text-xs text-red-300 hover:text-red-200 underline inline-flex items-center gap-1.5"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <RevolvrIcon name="trash" size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <img
                      src={post.image_url}
                      alt={post.caption}
                      className="w-full max-h-[480px] object-cover"
                    />
                  </div>

                  {post.caption && (
                    <p className="px-4 py-3 text-sm text-white/90">
                      {post.caption}
                    </p>
                  )}

                  <div className="px-4 pb-3">
  <div className="flex gap-2">
    {REACTION_EMOJIS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        aria-label={`React with ${emoji}`}
        className="inline-flex items-center justify-center text-lg hover:scale-110 transition-transform"
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
        </section>
      </main>

      {/* Composer modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="w-full max-w-md rounded-2xl bg-[#050816] border border-white/15 shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h2 className="text-base font-semibold">New post</h2>
              <button
                className="text-sm text-white/60 hover:text-white"
                onClick={() => !isPosting && setIsComposerOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="px-4 py-3 space-y-4" onSubmit={handleCreatePost}>
              <label className="text-sm font-medium space-y-1">
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setFile(e.target.files ? e.target.files[0] : null)
                  }
                  className="block w-full text-sm text-white/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-medium file:bg-emerald-500 file:text-black hover:file:bg-emerald-400"
                />
              </label>

              <label className="text-sm font-medium space-y-1">
                <span>Caption</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="Say something wild…"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
                  onClick={() => !isPosting && setIsComposerOpen(false)}
                  disabled={isPosting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium shadow-md shadow-emerald-500/25 transition disabled:opacity-60"
                  disabled={isPosting}
                >
                  {isPosting ? "Posting…" : "Post to Revolvr"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Identity Lens overlay */}
      <IdentityLens
        open={isLensOpen}
        onClose={() => setIsLensOpen(false)}
        userEmail={userEmail}
      />
    </div>
  );
}
