// src/app/creator/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { useAuthedUser } from "@/lib/useAuthedUser";
import SpinButton from "@/components/SpinButton";
import IdentityLens from "@/components/IdentityLens";
import { RevolvrIcon } from "@/components/RevolvrIcon";

const POSTS_TABLE = "Post"; // Supabase table created by Prisma

type UserCredits = {
  boosts: number;
  tips: number;
  spins: number;
};

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  is_boosted?: boolean | null;
  boost_expires_at?: string | null;
};

type Spin = {
  id: number;
  user_email: string;
  post_id: string | null;
  created_at: string;
};
const VerifiedBadge = () => (
  <span
    title="Verified creator"
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px]"
  >
    ✓
  </span>
);

export default function DashboardClient() {
  const router = useRouter();

  // Stable auth state (prevents bounce caused by "resolving" being treated as "logged out")
  const { user, ready } = useAuthedUser();

  // Derived user email (normalized)
  const userEmail = useMemo(() => {
    if (!ready) return null;
    const email = user?.email ? String(user.email).trim().toLowerCase() : null;
    return email || null;
  }, [ready, user]);

  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [spins, setSpins] = useState<Spin[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingSpins, setIsLoadingSpins] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [verifiedEmails, setVerifiedEmails] = useState<Record<string, boolean>>({});
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [isLensOpen, setIsLensOpen] = useState(false);

  // Redirect ONLY after auth is resolved
  useEffect(() => {
  if (!ready) return;

  // DIAGNOSTIC: disable redirect during bounce isolation
  if (!userEmail) {
    console.warn("[creator/dashboard] no userEmail after ready (diagnostic)");
    // router.replace("/login?redirectTo=/creator/onboard");
  }
}, [ready, userEmail, router]);


  // Load posts from Supabase Post table
  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;

      setPosts((data as Post[]) ?? []);
    } catch (e) {
      console.error("Error loading posts", e);
      setError("Revolvr glitched out while loading the feed 😵‍💫");
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);


  const loadVerifiedAuthors = useCallback(async (emails: string[]) => {
    try {
      const uniq = Array.from(
        new Set(
          (emails || [])
            .map((e) => String(e || "").trim().toLowerCase())
            .filter(Boolean)
        )
      );

      if (uniq.length === 0) {
        setVerifiedMap({});
        return;
      }

      const res = await fetch(`/api/creator/verified?emails=${encodeURIComponent(uniq.join(","))}`, {
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);
      const verified: string[] = Array.isArray(json?.verified) ? json.verified : [];

      const m: Record<string, boolean> = {};
      for (const em of verified) m[String(em).toLowerCase()] = true;
      setVerifiedMap(m);
    } catch (e) {
      // non-critical
      console.warn("[creator/dashboard] failed to load verified authors", e);
    }
  }, []);

  // Load spins
  const loadSpins = useCallback(async (email: string) => {
    try {
      setIsLoadingSpins(true);

      const { data, error } = await supabase
        .from("spinner_spins")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSpins((data as Spin[]) ?? []);
    } catch (e) {
      console.error("Error loading spins", e);
    } finally {
      setIsLoadingSpins(false);
    }
  }, []);

  // Load credits for user (via API route)
  const loadCredits = useCallback(async (email: string) => {
    try {
      setLoadingCredits(true);
      const res = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        console.error("Failed to load credits", await res.text());
        return;
      }
      const data = await res.json();
      setCredits({
        boosts: data.boosts ?? 0,
        tips: data.tips ?? 0,
        spins: data.spins ?? 0,
      });
    } catch (err) {
      console.error("Error fetching credits", err);
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  
  const loadCreatorMe = useCallback(async () => {
    try {
      const res = await fetch("/api/creator/me", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const verified = Boolean(json?.creator?.isVerified);
      setIsVerified(verified);
    } catch (e) {
      console.warn("[creator/dashboard] failed to load /api/creator/me", e);
    }
  }, []);

// When auth is resolved and we have an email, load posts, spins, credits
  useEffect(() => {
    if (!ready) return;
    if (!userEmail) return;

    loadPosts();
    loadSpins(userEmail);
    loadCredits(userEmail);
  

    loadCreatorMe();
  }, [ready, userEmail, loadPosts, loadSpins, loadCredits, loadCreatorMe]);


  // Load verified status for authors in the current post list (feed marketing)
  useEffect(() => {
    if (!posts || posts.length === 0) {
      setVerifiedMap({});
      return;
    }
    const emails = posts.map((p) => p.userEmail).filter(Boolean) as string[];
    loadVerifiedAuthors(emails);
  }, [posts, loadVerifiedAuthors]);
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/public-feed");
  };

  const handleStartBlueTick = async (tier: "blue" | "gold" = "blue") => {
    try {
      setIsLoadingVerify(true);
      setError(null);

      const res = await fetch("/api/creator/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Could not start Blue Tick checkout.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("Stripe did not return a checkout URL.");
    } catch (e) {
      console.error("[creator/dashboard] start blue tick error", e);
      setError("Revolvr glitched out starting Blue Tick 😵‍💫");
    } finally {
      setIsLoadingVerify(false);
    }
  };


  const handleCreatePost = async (event: FormEvent) => {
    event.preventDefault();
    if (!userEmail) return;
    if (!file) {
      setError("Please add an image or short video before posting.");
      return;
    }

    try {
      setIsPosting(true);
      setError(null);

      const fileExt = file.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from("posts")
        .upload(filePath, file);

      if (storageError || !storageData) {
        throw storageError ?? new Error("Upload failed");
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(storageData.path);

      const { data: inserted, error: insertError } = await supabase
        .from(POSTS_TABLE)
        .insert({
          userEmail: userEmail,
          imageUrl: publicUrl,
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
      const { error } = await supabase.from(POSTS_TABLE).delete().eq("id", id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error("Error deleting post", e);
      setError("Revolvr glitched out while deleting that post 😵‍💫");
    }
  };

  // Spend boost credit if available, else fallback to Stripe
  const handleBoostPost = async (postId: string, boostAmountCents = 500) => {
    if (!userEmail) {
      setError("You need to be logged in to boost a post.");
      return;
    }

    try {
      setError(null);

      // 1) If user has boost credits, spend one instead of charging via Stripe
      if (credits && credits.boosts > 0) {
        const res = await fetch("/api/credits/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: userEmail,
            kind: "boost",
            postId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("Failed to spend boost credit:", data);
          setError(data.error ?? "Could not spend a boost credit.");
          return;
        }

        // Update local credits state
        if (data.credits) {
          setCredits({
            boosts: data.credits.boosts ?? 0,
            tips: data.credits.tips ?? 0,
            spins: data.credits.spins ?? 0,
          });
        } else {
          setCredits((prev) =>
            prev ? { ...prev, boosts: Math.max(0, prev.boosts - 1) } : prev
          );
        }

        // Optionally mark the post as boosted locally
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, is_boosted: true } : p))
        );

        return; // done, no Stripe
      }

      // 2) No credits left → fall back to Stripe checkout
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

  // UI guards (prevents flash/bounce rendering)
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
        <p className="mt-2 text-white/70">Loading your session…</p>
      </div>
    );
  }

  // ready but not authed -> redirecting
  if (!userEmail) {
  return (
    <div className="min-h-screen bg-[#050816] text-white p-8">
      <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
      <p className="mt-2 text-white/70">
        Not signed in (diagnostic). No redirect will happen right now.
      </p>
      <a className="underline text-white/80" href="/login?redirectTo=/creator/onboard">
        Go to login
      </a>
    </div>
  );
}


  const avatarInitial = userEmail?.[0]?.toUpperCase() ?? "R";

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-2">
          <RevolvrIcon name="boost" size={20} className="hidden sm:block" alt="Revolvr" />
          <span className="text-lg font-semibold tracking-tight">Revolvr</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLensOpen(true)}
            className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-black"
          >
            {avatarInitial}
          </button>
          {isVerified && <VerifiedBadge />}
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

      {/* Main layout */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Left rail – creator summary */}
        <aside className="hidden md:flex w-64 flex-col gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <RevolvrIcon name="analytics" size={18} />
              <h2 className="text-sm font-semibold">Creator dashboard</h2>
            </div>
            <p className="text-xs text-white/60">Post from here. Everyone else watches the chaos.</p>
            <div className="mt-2 flex items-center gap-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Blue Tick active
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isLoadingVerify}
                    onClick={() => handleStartBlueTick("blue")}
                    className="inline-flex items-center justify-center text-xs px-3 py-1 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60"
                  >
                    {isLoadingVerify ? "Starting…" : "Get Blue Tick (Recurring)"}
                  </button>

                  <button
                    type="button"
                    disabled={isLoadingVerify}
                    onClick={() => handleStartBlueTick("gold")}
                    className="inline-flex items-center justify-center text-xs px-3 py-1 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60"
                  >
                    {isLoadingVerify ? "Starting…" : "Get Gold Tick (Recurring)"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
onClick={() => setIsComposerOpen(true)}
                className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-medium shadow-lg shadow-emerald-500/25 transition gap-2"
              >
                <RevolvrIcon name="add" size={14} />
                <span>New post</span>
              </button>
              <SpinButton userEmail={userEmail} />
            </div>

            {/* Credits widget */}
            {credits && (
              <div className="mt-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/80">Your credits</span>
                  {loadingCredits && <span className="text-[10px] text-white/50">Refreshing…</span>}
                </div>
                <div className="flex justify-between">
                  <span>Boosts</span>
                  <span className="font-mono">{credits.boosts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tips</span>
                  <span className="font-mono">{credits.tips}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spins</span>
                  <span className="font-mono">{credits.spins}</span>
                </div>
              </div>
            )}
          </section>
        </aside>

        {/* Center column – feed */}
        <section className="flex-1 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
              <span>{error}</span>
              <button className="text-xs underline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {/* Posts */}
          {isLoadingPosts ? (
            <div className="text-sm text-white/70">Loading the feed…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-white/70">
              No posts yet. Be the first to spin something into existence ✨
            </div>
          ) : (
            <div className="space-y-6 pb-12">
              {posts.map((post) => {
                const displayName = (() => {
                  if (!post.userEmail) return "Someone";
                  const [localPart] = post.userEmail.split("@");
                  const cleaned = localPart.replace(/\W+/g, " ").trim();
                  return cleaned || post.userEmail;
                })();

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                          {(post.userEmail ?? "R")[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-[220px]">
                            {displayName}
                          {verifiedMap[String(post.userEmail || "").toLowerCase()] ? <span className="ml-1 inline-flex align-middle"><VerifiedBadge /></span> : null}</span>
                          <span className="text-[11px] text-white/40">
                            {new Date(post.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="text-xs text-emerald-300 hover:text-emerald-200 underline inline-flex items-center gap-1.5"
                          onClick={() => handleBoostPost(post.id)}
                        >
                          <RevolvrIcon name="boost" size={14} />
                          <span>Boost</span>
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

                    {/* Media */}
                    <div>
                      <img src={post.imageUrl} alt={post.caption} className="w-full max-h-[480px] object-cover" />
                    </div>

                    {/* Caption */}
                    {post.caption && <p className="px-4 py-3 text-sm text-white/90">{post.caption}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Composer Modal */}
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
              {/* Upload Section */}
              <div>
                <label className="text-xs font-medium text-white/70 block mb-2">Image or short video</label>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  className="w-full h-64 rounded-xl border border-white/15 bg-black/20 flex flex-col items-center justify-center cursor-pointer hover:bg-black/30 transition"
                  onClick={() => document.getElementById("revolvrUploadInput")?.click()}
                >
                  {!file ? (
                    <div className="flex flex-col items-center gap-2 text-white/60">
                      <div className="w-12 h-12 border border-white/20 rounded-lg flex items-center justify-center">
                        <span className="text-xl">↑</span>
                      </div>
                      <span className="text-xs">Click or drop to upload</span>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-hidden rounded-lg">
                      {file.type.startsWith("video") ? (
                        <video src={URL.createObjectURL(file)} controls className="w-full h-full object-cover" />
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

      <IdentityLens open={isLensOpen} onClose={() => setIsLensOpen(false)} userEmail={userEmail} />
    </div>
  );
}
