"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { FloatingLiveButton } from "@/components/FloatingLiveButton";

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

  // Composer state
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showComposer, setShowComposer] = useState<boolean>(false);

  // Load current user
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
          .select(
            "id, user_email, image_url, caption, created_at, tip_count, boost_count, spin_count"
          )
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
        console.error("Error loading public feed", e);
        setError("Revolvr glitched out loading the public feed 😵‍💫");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // People rail
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

  // Filtered posts
  const visiblePosts = useMemo(
    () =>
      selectedUserEmail
        ? posts.filter((p) => p.user_email === selectedUserEmail)
        : posts,
    [posts, selectedUserEmail]
  );

  // Local reactions
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

  // Auth guard
  const ensureLoggedIn = () => {
    if (!userEmail) {
      const redirect = encodeURIComponent("/public-feed");
      router.push(`/login?redirectTo=${redirect}`);
      return false;
    }
    return true;
  };

  const scrollToComposer = () => {
    const el = document.getElementById("revolvrComposer");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Create post
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

  // Payments
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

  const openPurchaseChoice = (postId: string, mode: PurchaseMode) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode });
  };

  const handleTipClick = (postId: string) => openPurchaseChoice(postId, "tip");
  const handleBoostClick = (postId: string) =>
    openPurchaseChoice(postId, "boost");
  const handleSpinClick = (postId: string) =>
    openPurchaseChoice(postId, "spin");

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
    const amountCents = singleAmountForMode(pendingPurchase.mode);

    await startPayment(
      pendingPurchase.mode,
      pendingPurchase.postId,
      amountCents
    );

    setPendingPurchase(null);
  };

  const handlePackPurchase = async () => {
    if (!pendingPurchase) return;
    const amountCents = packAmountForMode(pendingPurchase.mode);

    await startPayment(
      pendingPurchase.mode,
      pendingPurchase.postId,
      amountCents
    );

    setPendingPurchase(null);
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

            {/* Composer */}
            {userEmail && showComposer && (
              <section
                id="revolvrComposer"
                className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/30 space-y-4"
              >
                <h2 className="text-sm sm:text-base font-semibold">
                  Create a Post
                </h2>

                <form className="space-y-4" onSubmit={handleCreatePost}>
                  {/* Upload */}
                  <div>
                    <label className="text-xs font-medium text-white/70 block mb-2">
                      Image or short video
                    </label>

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

                    <input
                      id="revolvrUploadInput"
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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

        {/* Bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050814]/95 backdrop-blur">
          <div className="mx-auto max-w-xl px-6 py-2 flex items-center justify-between text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => router.push("/public-feed")}
              className="flex flex-col items-center flex-1 text-white/70 hover:text-white"
            >
              <span className="text-lg">🏠</span>
              <span className="mt-0.5">Feed</span>
            </button>

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

      {/* Floating Go Live button – *on top* of feed */}
      <FloatingLiveButton />
    </>
  );
}

/* ---------- PeopleRail, PublicPostCard, PurchaseChoiceSheet
   (exactly as you already had them) – I omitted them here
   since they’re unchanged from your last version.
   Keep your existing definitions below this comment.
*/
