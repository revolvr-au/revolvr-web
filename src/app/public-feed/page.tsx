"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  reactions?: Record<string, number>;
};

const REACTION_EMOJIS = ["🔥", "💀", "😂", "🤪", "🥴"] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

type PurchaseMode = "tip" | "boost" | "spin";

type PendingPurchase = {
  postId: string;
  mode: PurchaseMode;
};

export default function PublicFeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] =
    useState<PendingPurchase | null>(null);

  // Composer state (top-of-feed)
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Load current user (if logged in)
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setUserEmail(user.email);
        } else {
          setUserEmail(null);
        }
      } catch (e) {
        console.error("Error loading user in public feed", e);
      }
    };

    fetchUser();
  }, []);

  // Load posts
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

  // Local reactions (no backend yet)
  const handleReact = (postId: string, emoji: ReactionEmoji) => {
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

  // Make sure user is logged in (for posting + payments)
  const ensureLoggedIn = () => {
    if (!userEmail) {
      const redirect = encodeURIComponent("/public-feed");
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  // Create post from public feed composer
  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!ensureLoggedIn()) return;

    if (!file) {
      setError("Please add an image or short video before posting.");
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

      setPosts((prev) =>
        inserted
          ? [
              {
                ...(inserted as Post),
                reactions: {},
              },
              ...prev,
            ]
          : prev
      );
      setCaption("");
      setFile(null);
    } catch (e) {
      console.error("Error creating post", e);
      setError("Revolvr glitched out while posting 😵‍💫 Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Generic payment starter for single tip / boost / spin
  const startPayment = async (
    mode: PurchaseMode,
    postId: string,
    amountCents: number
  ) => {
    if (!ensureLoggedIn()) return;
    if (!userEmail) return;

    try {
      setError(null);

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          userEmail,
          amountCents,
          postId,
        }),
      });

      if (!res.ok) {
        console.error("Checkout failed:", await res.text());
        setError("Revolvr glitched out starting checkout 😵‍💫 Try again.");
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Stripe did not return a checkout URL.");
      }
    } catch (e) {
      console.error("Error starting payment", e);
      setError("Revolvr glitched out talking to Stripe 😵‍💫");
    }
  };

  // Open the "single vs pack" choice
  const openPurchaseChoice = (postId: string, mode: PurchaseMode) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode });
  };

  const handleTipClick = (postId: string) => openPurchaseChoice(postId, "tip");
  const handleBoostClick = (postId: string) =>
    openPurchaseChoice(postId, "boost");
  const handleSpinClick = (postId: string) =>
    openPurchaseChoice(postId, "spin");

  // When user chooses "single" in the popup
  const handleSinglePurchase = async () => {
    if (!pendingPurchase) return;
    const { postId, mode } = pendingPurchase;

    if (mode === "tip") {
      await startPayment("tip", postId, 200); // A$2
    } else if (mode === "boost") {
      await startPayment("boost", postId, 500); // A$5
    } else {
      await startPayment("spin", postId, 100); // A$1
    }

    setPendingPurchase(null);
  };

  // When user chooses "pack" in the popup
  const handlePackPurchase = () => {
    if (!pendingPurchase) return;
    const { mode } = pendingPurchase;

    router.push(`/credits?mode=${mode}`);
    setPendingPurchase(null);
  };

  // Scroll to composer when +Post clicked
  const scrollToComposer = () => {
    const el = document.getElementById("revolvrComposer");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/90 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm sm:text-base">Revolvr</span>
          <span className="text-base">🔥</span>
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm text-white/70">
          <button
            onClick={scrollToComposer}
            className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-xs sm:text-sm"
          >
            + Post
          </button>
          {userEmail ? (
            <span className="hidden sm:inline text-white/70">
              {userEmail}
            </span>
          ) : (
            <Link
              href="/login?redirectTo=/public-feed"
              className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition text-xs"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 sm:px-0 py-4 space-y-4">
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

          {/* Composer */}
          <section
            id="revolvrComposer"
            className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/30 space-y-4"
          >
            <h2 className="text-sm sm:text-base font-semibold">Create a Post</h2>

            <form className="space-y-4" onSubmit={handleCreatePost}>
              {/* Upload Section */}
              <div>
                <label className="text-xs font-medium text-white/70 block mb-2">
                  Image or short video
                </label>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  className="w-full h-48 rounded-xl border border-white/15 bg-black/20 
                             flex flex-col items-center justify-center cursor-pointer 
                             hover:bg-black/30 transition"
                  onClick={() =>
                    document.getElementById("revolvrUploadInput")?.click()
                  }
                >
                  {!file ? (
                    <div className="flex flex-col items-center gap-2 text-white/60">
                      <div
                        className="w-12 h-12 border border-white/20 rounded-lg 
                                   flex items-center justify-center"
                      >
                        <span className="text-xl">↑</span>
                      </div>
                      <span className="text-xs">Click or drop to upload</span>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      {file.type.startsWith("video") ? (
                        <video
                          src={URL.createObjectURL(file)}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                          alt="preview"
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Hidden input */}
                <input
                  id="revolvrUploadInput"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />

                <p className="mt-2 text-[11px] text-white/40">
                  Supported: JPG, PNG, GIF, MP4 (short clips work best).
                </p>
              </div>

              {/* Caption */}
              <div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  placeholder="Say something wild…"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full border border-white/20 text-xs sm:text-sm hover:bg-white/10 transition"
                  onClick={() => {
                    if (isPosting) return;
                    setFile(null);
                    setCaption("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPosting}
                  className="px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-xs sm:text-sm font-medium text-black shadow-md shadow-emerald-500/25 disabled:opacity-60"
                >
                  {isPosting ? "Posting…" : "Post"}
                </button>
              </div>
            </form>
          </section>

          {/* Header text */}
          <div className="flex items-start justify-between mt-1 mb-2">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-white/90">
                Public feed
              </h1>
              <p className="text-xs sm:text-sm text-white/60 mt-1">
                Anyone can watch this. Want to keep posting?{" "}
                <Link href="/login" className="underline">
                  Sign in
                </Link>{" "}
                to save your spins and tips.
              </p>
            </div>
            <span className="text-[11px] text-white/40 self-center">
              v0.1 · social preview
            </span>
          </div>

          {/* Feed body */}
          {isLoading ? (
            <div className="text-center text-sm text-white/60 py-10">
              Loading the chaos…
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-sm text-white/60 py-10">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {posts.map((post) => (
                <PublicPostCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                  onTip={handleTipClick}
                  onBoost={handleBoostClick}
                  onSpin={handleSpinClick}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Single vs pack popup */}
      {pendingPurchase && (
        <PurchaseChoiceSheet
          pending={pendingPurchase}
          onClose={() => setPendingPurchase(null)}
          onSingle={handleSinglePurchase}
          onPack={handlePackPurchase}
        />
      )}
    </div>
  );
}

type PublicPostCardProps = {
  post: Post;
  onReact: (postId: string, emoji: ReactionEmoji) => void;
  onTip: (postId: string) => void;
  onBoost: (postId: string) => void;
  onSpin: (postId: string) => void;
};

function PublicPostCard({
  post,
  onReact,
  onTip,
  onBoost,
  onSpin,
}: PublicPostCardProps) {
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

      {/* Media */}
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

      {/* Caption */}
      {post.caption && (
        <p className="mt-2 text-sm text-white/90 break-words">
          {post.caption}
        </p>
      )}

      {/* Tip / Boost / Spin row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onTip(post.id)}
          className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-medium text-emerald-200"
        >
          Tip A$2
        </button>
        <button
          type="button"
          onClick={() => onBoost(post.id)}
          className="px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 text-[11px] font-medium text-indigo-200"
        >
          Boost A$5
        </button>
        <button
          type="button"
          onClick={() => onSpin(post.id)}
          className="px-3 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 text-[11px] font-medium text-pink-200"
        >
          Spin A$1
        </button>
      </div>

      {/* Reactions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {REACTION_EMOJIS.map((emoji) => {
            const count = post.reactions?.[emoji] ?? 0;

            return (
              <button
                key={emoji}
                type="button"
                aria-label={`React ${emoji}`}
                onClick={() => onReact(post.id, emoji)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg:white/0 hover:bg-white/10 text-lg"
              >
                <span>{emoji}</span>
                {count > 0 && (
                  <span className="ml-1 text-[11px] text-white/70 leading-none">
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
}

type PurchaseChoiceSheetProps = {
  pending: PendingPurchase;
  onClose: () => void;
  onSingle: () => void;
  onPack: () => void;
};

function PurchaseChoiceSheet({
  pending,
  onClose,
  onSingle,
  onPack,
}: PurchaseChoiceSheetProps) {
  const modeLabel =
    pending.mode === "tip"
      ? "Tip"
      : pending.mode === "boost"
      ? "Boost"
      : "Spin";

  const singleAmount =
    pending.mode === "tip"
      ? "A$2"
      : pending.mode === "boost"
      ? "A$5"
      : "A$1";

  const packLabel =
    pending.mode === "tip"
      ? "tip pack"
      : pending.mode === "boost"
      ? "boost pack"
      : "spin pack";

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm mb-6 mx-4 rounded-2xl bg-[#070b1b] border border-white/10 p-4 space-y-3 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Support this post with a {modeLabel}
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-white/60">
          Choose a one-off {modeLabel.toLowerCase()} or grab a pack so you
          don&apos;t have to check out every time.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onSingle}
            className="flex-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/60 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">
              Single {modeLabel} ({singleAmount})
            </div>
            <div className="text-[11px] text-emerald-200/80">
              Quick one-off support
            </div>
          </button>

          <button
            type="button"
            onClick={onPack}
            className="flex-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-2 text-xs text-left"
          >
            <div className="font-semibold">Buy {packLabel}</div>
            <div className="text-[11px] text-white/70">
              Better value, more {modeLabel.toLowerCase()}s
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-[11px] text-white/45 hover:text-white/70 mt-1"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
