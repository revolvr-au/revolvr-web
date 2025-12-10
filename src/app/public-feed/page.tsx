"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { FloatingLiveButton } from "@/components/FloatingLiveButton";

type LiveSessionSummary = {
  id: string;
  room_name: string;
  title: string | null;
  status: string;
};

type Post = {
  id: string;
  user_email: string;
  image_url: string;
  caption: string;
  created_at: string;
  reactions?: Record<string, number>;
  tip_count?: number;
  boost_count?: number;
  spin_count?: number;
};

type Person = {
  email: string;
  avatarUrl?: string;
  firstName: string;
  postCount: number;
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

  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null
  );

  // 🔴 LIVE NOW – active streams
  const [liveSessions, setLiveSessions] = useState<LiveSessionSummary[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveDisabled, setLiveDisabled] = useState(false);

  // Poll live sessions from Supabase (but never show the red banner if it fails)
  useEffect(() => {
    if (liveDisabled) return;

    let cancelled = false;

    async function loadLive() {
      try {
        setLiveLoading(true);

        const { data, error } = await supabase
          .from("live_sessions")
          .select("id, room_name, title, status")
          .eq("status", "live")
          .order("created_at", { ascending: false })
          .limit(10);

        if (cancelled) return;

        if (error) {
          console.error("[public-feed] live_sessions error:", error);

          const code = (error as any).code;
          const message = (error as any).message as string | undefined;

          if (
            code === "PGRST205" ||
            message?.toLowerCase().includes("could not find the table")
          ) {
            console.warn(
              "[public-feed] live_sessions table missing in this environment – disabling live strip."
            );
            setLiveDisabled(true);
            setLiveSessions([]);
            return;
          }

          setLiveSessions([]);
        } else {
          setLiveSessions(data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[public-feed] live_sessions unexpected error:", err);
          setLiveSessions([]);
        }
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    }

    loadLive();
    const interval = setInterval(loadLive, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [liveDisabled]);

  // Composer state (top-of-feed)
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState<boolean>(false);

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
    async function fetchPosts() {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        setPosts(
          (data ?? []).map((row: any) => ({
            id: row.id,
            user_email: row.user_email,
            image_url: row.image_url,
            caption: row.caption,
            created_at: row.created_at,
            tip_count: row.tip_count,
            boost_count: row.boost_count,
            spin_count: row.spin_count,
            reactions: {},
          }))
        );
      } catch (e) {
        console.error("Error loading public feed posts", e);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPosts();
  }, []);

  // People rail data
  const people: Person[] = useMemo(() => {
    const byEmail = new Map<string, Person>();

    for (const post of posts) {
      if (!post.user_email) continue;

      const existing = byEmail.get(post.user_email);
      if (existing) {
        existing.postCount += 1;
        continue;
      }

      const fromEmail =
        post.user_email.split("@")[0]?.replace(/\W+/g, " ").trim() || null;

      const firstName = fromEmail || "Someone";

      byEmail.set(post.user_email, {
        email: post.user_email,
        avatarUrl: post.image_url,
        firstName,
        postCount: 1,
      });
    }

    return Array.from(byEmail.values());
  }, [posts]);

  // Posts filtered by selected person
  const visiblePosts = useMemo(
    () =>
      selectedUserEmail
        ? posts.filter((p) => p.user_email === selectedUserEmail)
        : posts,
    [posts, selectedUserEmail]
  );

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

  // Scroll to composer when +Post clicked
  const scrollToComposer = () => {
    const el = document.getElementById("revolvrComposer");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      setShowComposer(false);
    } catch (e) {
      console.error("Error creating post", e);
      setError("Revolvr glitched out while posting 😵‍💫 Try again.");
    } finally {
      setIsPosting(false);
    }
  };

  // Generic payment starter – now sends "tip" vs "tip-pack" etc.
  const startPayment = async (
    mode: PurchaseMode,
    postId: string,
    kind: "single" | "pack"
  ) => {
    if (!ensureLoggedIn()) return;
    if (!userEmail) return;

    try {
      setError(null);

      const checkoutMode =
        kind === "pack"
          ? (`${mode}-pack` as "tip-pack" | "boost-pack" | "spin-pack")
          : mode;

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: checkoutMode,
          userEmail,
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

  // These helpers are available if you want to use them in labels
  const singleAmountForMode = (mode: PurchaseMode) => {
    switch (mode) {
      case "tip":
        return 200;
      case "boost":
        return 500;
      case "spin":
      default:
        return 100;
    }
  };

  const packAmountForMode = (mode: PurchaseMode) => {
    switch (mode) {
      case "tip":
        return 1000;
      case "boost":
        return 2500;
      case "spin":
      default:
        return 500;
    }
  };

  const handleSinglePurchase = async () => {
    if (!pendingPurchase) return;
    await startPayment(pendingPurchase.mode, pendingPurchase.postId, "single");
    setPendingPurchase(null);
  };

  const handlePackPurchase = async () => {
    if (!pendingPurchase) return;
    await startPayment(pendingPurchase.mode, pendingPurchase.postId, "pack");
    setPendingPurchase(null);
  };

  // Click handlers passed to PublicPostCard
  const handleTipClick = (postId: string) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode: "tip" });
  };

  const handleBoostClick = (postId: string) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode: "boost" });
  };

  const handleSpinClick = (postId: string) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode: "spin" });
  };

  // --- JSX ---
  return (
    <>
      <div className="min-h-screen bg-[#050814] text-white flex flex-col">
        {/* Main content */}
        <main className="flex-1 flex justify-center">
          <div className="w-full max-w-xl px-3 sm:px-0 py-6 space-y-4 pb-24">
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

            {/* Brand hero */}
            <header className="text-center mb-2">
              <h1 className="text-3xl sm:text-4xl font-semibold text-white/95 tracking-tight">
                Revolvr
              </h1>
              <p className="text-[11px] text-white/45 mt-1">
                v0.1 · social preview
              </p>
            </header>

            {/* Composer – only when logged in AND explicitly opened */}
            {userEmail && showComposer && (
              <section
                id="revolvrComposer"
                className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/30 space-y-4"
              >
                <h2 className="text-sm sm:text-base font-semibold">
                  Create a Post
                </h2>

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
                        const files = e.dataTransfer.files;
                        const dropped =
                          files && files.length > 0 ? files[0] : null;
                        if (dropped) {
                          setFile(dropped);
                        }
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
                          <span className="text-xs">
                            Click or drop to upload
                          </span>
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
                      onChange={(e) => {
                        const files = e.target.files;
                        const nextFile =
                          files && files.length > 0 ? files[0] : null;
                        setFile(nextFile);
                      }}
                    />
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
                        setShowComposer(false);
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
            )}

            {/* 🔴 LIVE NOW STRIP – only if liveSessions available and live not disabled */}
            {!liveDisabled && liveSessions.length > 0 && (
              <section className="mb-6 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-fuchsia-500/10 to-purple-500/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-sm font-semibold text-pink-100">
                      Live now on Revolvr
                    </span>
                  </div>

                  {liveLoading && (
                    <span className="text-xs text-zinc-400">Refreshing…</span>
                  )}
                </div>

                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {liveSessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/live/${encodeURIComponent(s.room_name)}`}
                      className="min-w-[220px] rounded-xl border border-white/5 bg-black/40 px-3 py-2 transition-colors hover:bg-black/60"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-semibold text-red-300">
                          LIVE
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate text-sm font-medium text-white">
                            {s.title || "Untitled stream"}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Tap to join stream
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* People rail */}
            {people.length > 0 && (
              <PeopleRail
                people={people}
                selectedEmail={selectedUserEmail}
                onSelectEmail={(email) => {
                  setSelectedUserEmail((current) =>
                    current === email ? null : email
                  );
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}

            {/* Feed body */}
            {isLoading ? (
              <div className="text-center text-sm text-white/60 py-10">
                Loading the chaos…
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center text-sm text-white/60 py-10">
                No posts yet. Be the first to spin something into existence ✨
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="text-center text-sm text-white/60 py-10">
                No posts yet from this person.
              </div>
            ) : (
              <div className="space-y-4">
                {visiblePosts.map((post) => (
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

        {/* Bottom app nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050814]/95 backdrop-blur">
          <div className="mx-auto max-w-xl px-6 py-2 flex items-center justify-between text-xs sm:text-sm">
            {/* Feed */}
            <button
              type="button"
              onClick={() => router.push("/public-feed")}
              className="flex flex-col items-center flex-1 text-white/70 hover:text-white"
            >
              <span className="text-lg">🏠</span>
              <span className="mt-0.5">Feed</span>
            </button>

            {/* Post */}
            <button
              type="button"
              onClick={() => {
                if (!ensureLoggedIn()) return;
                setShowComposer(true);
                scrollToComposer();
              }}
              className="flex flex-col items-center flex-1 text-emerald-300 hover:text-emerald-100"
            >
              <span className="text-lg">➕</span>
              <span className="mt-0.5">Post</span>
            </button>

            {/* Profile */}
            <button
              type="button"
              onClick={() => {
                if (!userEmail) {
                  const redirect = encodeURIComponent("/public-feed");
                  router.push(`/login?redirectTo=${redirect}`);
                  return;
                }
                router.push(`/u/${encodeURIComponent(userEmail)}`);
              }}
              className="flex flex-col items-center flex-1 text-white/70 hover:text-white"
            >
              <span className="text-lg">👤</span>
              <span className="mt-0.5">Profile</span>
            </button>
          </div>
        </nav>

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

      {/* 🔴 Floating Go Live button – only on public feed */}
      <FloatingLiveButton />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* People rail                                                        */
/* ------------------------------------------------------------------ */

type PeopleRailProps = {
  people: Person[];
  selectedEmail: string | null;
  onSelectEmail: (email: string | null) => void;
};

function PeopleRail({ people, selectedEmail, onSelectEmail }: PeopleRailProps) {
  return (
    <section className="mb-3">
      <div className="flex items-center justify-between mb-2">
        {selectedEmail && (
          <button
            type="button"
            onClick={() => onSelectEmail(null)}
            className="ml-auto text-[11px] text-white/50 hover:text-white/80"
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {people.map((person) => {
            const isActive = person.email === selectedEmail;

            return (
              <button
                key={person.email}
                type="button"
                onClick={() => onSelectEmail(person.email)}
                className={`flex-shrink-0 rounded-3xl border px-2.5 py-2 min-w-[110px] max-w-[130px] transition relative overflow-hidden ${
                  isActive
                    ? "bg-white text-black border-white shadow-sm shadow-black/40"
                    : "bg-white/5 border-white/15 text-white hover:bg-white/10"
                }`}
              >
                <div className="w-full h-20 rounded-2xl overflow-hidden bg-black/40 mb-2 relative">
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt={person.firstName}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-semibold">
                      {person.firstName[0]?.toUpperCase() ?? "R"}
                    </div>
                  )}

                  <div className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-full bg-black/80 flex items-center justify-center text-[11px] font-semibold">
                    {person.firstName[0]?.toUpperCase() ?? "R"}
                  </div>
                </div>

                <span className="text-[11px] font-semibold truncate w-full text-left block">
                  {person.firstName}
                </span>
                <span
                  className={`text-[10px] ${
                    isActive ? "text-black/70" : "text-white/60"
                  }`}
                >
                  {person.postCount} post{person.postCount === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-[#050814] to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-[#050814] to-transparent" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Public post card                                                   */
/* ------------------------------------------------------------------ */

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
  const [pulse, setPulse] = useState(false);

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

  const displayName = useMemo(() => {
    if (!post.user_email) return "Someone";

    const [localPart] = post.user_email.split("@");
    const cleaned = localPart.replace(/\W+/g, " ").trim();

    return cleaned || post.user_email;
  }, [post.user_email]);

  const isVideo = !!post.image_url?.match(/\.(mp4|webm|ogg)$/i);

  const triggerPulse = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 350);
  };

  return (
    <article
      className={`rounded-2xl bg-[#070b1b] border border-white/10 p-3 sm:p-4 shadow-md shadow-black/30 transition-all duration-300 ${
        pulse ? "ring-2 ring-emerald-400/40 scale-[1.01]" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
            {post.user_email?.[0]?.toUpperCase() ?? "R"}
          </div>
          <div className="flex flex-col">
            {post.user_email ? (
              <Link
                href={`/u/${encodeURIComponent(post.user_email)}`}
                className="text-sm font-medium truncate max-w-[160px] sm:max-w-[220px] hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-[220px]">
                {displayName}
              </span>
            )}
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

      {/* Support counts */}
      {(post.tip_count ?? 0) +
        (post.boost_count ?? 0) +
        (post.spin_count ?? 0) >
        0 && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-white/60">
          {!!post.tip_count && (
            <span>
              💸 {post.tip_count} tip{post.tip_count === 1 ? "" : "s"}
            </span>
          )}
          {!!post.boost_count && (
            <span>
              🚀 {post.boost_count} boost{post.boost_count === 1 ? "" : "s"}
            </span>
          )}
          {!!post.spin_count && (
            <span>
              🌀 {post.spin_count} spin{post.spin_count === 1 ? "" : "s"}
            </span>
          )}
        </div>
      )}

      {/* Tip / Boost / Spin row */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            triggerPulse();
            onTip(post.id);
          }}
          className="px-3 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-medium text-emerald-200 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
        >
          Tip A$2
        </button>
        <button
          type="button"
          onClick={() => {
            triggerPulse();
            onBoost(post.id);
          }}
          className="px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/60 text-[11px] font-medium text-indigo-200 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
        >
          Boost A$5
        </button>
        <button
          type="button"
          onClick={() => {
            triggerPulse();
            onSpin(post.id);
          }}
          className="px-3 py-1.5 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/60 text-[11px] font-medium text-pink-200 transition-transform duration-150 hover:-translate-y-0.5 active:scale-95"
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
                className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/0 hover:bg-white/10 text-lg"
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

/* ------------------------------------------------------------------ */
/* Purchase choice sheet                                              */
/* ------------------------------------------------------------------ */

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
    <div className="fixed inset-0 z-30 flex items-end justifycenter bg-black/40 backdrop-blur-sm">
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
