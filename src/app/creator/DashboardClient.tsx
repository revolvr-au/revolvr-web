// src/app/creator/DashboardClient.tsx
"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClients";
import { useAuthedUser } from "@/lib/useAuthedUser";
import SpinButton from "@/components/SpinButton";
import IdentityLens from "@/components/IdentityLens";
import { RevolvrIcon } from "@/components/RevolvrIcon";
import { PaidReactionBar } from "@/components/PaidReactionBar";

const POSTS_TABLE = "Post"; // Supabase table created by Prisma

function _isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}


type UserCredits = {
  boosts: number;
  tips: number;
  spins: number;
};

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string | null;
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

type CreatorMeResponse = {
  loggedIn?: boolean;
  creator?: {
    isVerified?: boolean;
    verificationTier?: "blue" | "gold" | null;
    verificationStatus?: string | null;
    verificationPriceId?: string | null;
    verificationCurrentPeriodEnd?: string | null;
  };
};



type VerifiedLookupResponse = {
  verified?: unknown;
  currencies?: unknown; // returned by endpoint, not required here
  error?: unknown;
};

type CreditsResponse = {
  boosts?: unknown;
  tips?: unknown;
  spins?: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasVerifiedArray(v: unknown): v is { verified: unknown } {
  return isRecord(v) && "verified" in v;
}

function normalizeVerifiedEmails(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
}

function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.userEmail === "string" &&
    typeof v.imageUrl === "string" &&
    (typeof v.caption === "string" || v.caption === null) &&
    typeof v.createdAt === "string"
  );
}
function isSpinRow(value: unknown): value is Spin {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.user_email === "string" &&
    typeof v.created_at === "string" &&
    (typeof v.post_id === "string" || v.post_id === null)
  );
}

function toNumberOrZero(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

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
  const searchParams = useSearchParams();


  // Stable auth state
  const { user, ready } = useAuthedUser();

  // Normalized email
  const userEmail = useMemo(() => {
    if (!ready) return null;
    const email = user?.email ? String(user.email).trim().toLowerCase() : null;
    return email || null;
  }, [ready, user]);

  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);

  // Keep these for future UI usage; underscore satisfies lint.
  const [_spins, setSpins] = useState<Spin[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [_isLoadingSpins, setIsLoadingSpins] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isVerified, setIsVerified] = useState(false);
  const [verificationTier, setVerificationTier] = useState<"blue" | "gold" | null>(null);
  const [isLoadingVerify, setIsLoadingVerify] = useState(false);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const [isLensOpen, setIsLensOpen] = useState(false);

  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  // Optional: redirect only AFTER auth resolved
  useEffect(() => {
    if (!ready) return;
    if (!userEmail) {
      // If you want redirect back on, uncomment:
      // router.replace("/login?redirectTo=/creator");
    }
  }, [ready, userEmail, router]);

  const loadPosts = useCallback(async () => {
    try {
      setIsLoadingPosts(true);
      setError(null);

      const { data, error: sbErr } = await supabase.from(POSTS_TABLE).select("*").order("createdAt", {
        ascending: false,
      });

      if (sbErr) throw sbErr;

      const rows = Array.isArray(data) ? data : [];
      setPosts(rows.filter(isPost));
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
        new Set((emails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))
      ).slice(0, 200);

      if (uniq.length === 0) {
        setVerifiedMap({});
        return;
      }

      const res = await fetch(`/api/creator/verified?emails=${encodeURIComponent(uniq.join(","))}`, {
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as VerifiedLookupResponse | null;

      const verifiedRaw = hasVerifiedArray(json) ? json?.verified ?? [] : [];
      const verifiedList = normalizeVerifiedEmails(verifiedRaw);

      const m: Record<string, boolean> = {};
      for (const em of verifiedList) m[em] = true;

      setVerifiedMap(m);
    } catch (e) {
      console.warn("[creator/dashboard] failed to load verified authors", e);
    }
  }, []);

  const loadSpins = useCallback(async (email: string) => {
    try {
      setIsLoadingSpins(true);

      const { data, error: sbErr } = await supabase
        .from("spinner_spins")
        .select("*")
        .eq("user_email", email)
        .order("created_at", { ascending: false });

      if (sbErr) throw sbErr;

      const rows = Array.isArray(data) ? data : [];
      const parsed: Spin[] = [];
      for (const r of rows) {
        if (isSpinRow(r)) parsed.push(r);
      }
      setSpins(parsed);
    } catch (e) {
      console.error("Error loading spins", e);
    } finally {
      setIsLoadingSpins(false);
    }
  }, []);

  const loadCredits = useCallback(async (email: string) => {
    try {
      setLoadingCredits(true);

      const res = await fetch(`/api/credits?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        console.error("Failed to load credits", await res.text().catch(() => ""));
        return;
      }

      const data = (await res.json().catch(() => null)) as CreditsResponse | null;

      setCredits({
        boosts: toNumberOrZero(data?.boosts),
        tips: toNumberOrZero(data?.tips),
        spins: toNumberOrZero(data?.spins),
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
      const json = (await res.json().catch(() => null)) as CreatorMeResponse | null;

      const verified = Boolean(json?.creator?.isVerified);

      // Tier can come from verificationTier OR from verificationStatus ("blue"/"gold")
      const status = String(json?.creator?.verificationStatus ?? "").toLowerCase();
      const tier =
        json?.creator?.verificationTier === "gold" || json?.creator?.verificationTier === "blue"
          ? json.creator.verificationTier
          : status === "gold"
            ? "gold"
            : status === "blue"
              ? "blue"
              : null;

      setIsVerified(verified);
      setVerificationTier(tier);
    } catch (e) {
      console.warn("[creator/dashboard] failed to load /api/creator/me", e);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!userEmail) return;

    loadPosts();
    loadSpins(userEmail);
    loadCredits(userEmail);
    loadCreatorMe();
  }, [ready, userEmail, loadPosts, loadSpins, loadCredits, loadCreatorMe]);

  useEffect(() => {
    if (!posts.length) {
      setVerifiedMap({});
      return;
    }
    const emails = posts.map((p) => p.userEmail).filter(Boolean);
    loadVerifiedAuthors(emails);
  }, [posts, loadVerifiedAuthors]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login?redirectTo=/creator");
  };
useEffect(() => {
  if (!ready || !userEmail) return;

  const stripe = searchParams ? searchParams.get("stripe") : null;
  const verified = searchParams ? searchParams.get("verified") : null;

  if (!stripe && !verified) return;

  loadCreatorMe();
  loadCredits(userEmail);

  if (verified === "success") {
    setNotice("Verification started successfully.");
  } else if (verified === "cancel") {
    setNotice("Verification was cancelled.");
  } else if (stripe === "return") {
    setNotice("Stripe onboarding complete. Payouts are connected.");
  } else if (stripe === "refresh") {
    setNotice("Stripe onboarding refreshed. Please complete setup.");
  }

  router.replace("/creator");
}, [ready, userEmail, searchParams, loadCreatorMe, loadCredits, router]);

  // Stripe Connect onboarding (payouts)
  const handleConnectStripe = async () => {
    try {
      setIsConnectingStripe(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        setError("You need to be signed in to set up payouts.");
        return;
      }

      const res = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;

      if (!res.ok) {
        setError((json?.error ? String(json.error) : null) || "Could not start Stripe payouts onboarding.");
        return;
      }

      const url = typeof json?.url === "string" ? json.url : "";
      if (url) {
        window.location.href = url;
        return;
      }

      setError("Stripe onboarding did not return a redirect URL.");
    } catch (e) {
      console.error("[creator/dashboard] connect stripe error", e);
      setError("Revolvr glitched out starting payouts setup.");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleStartBlueTick = async (tier: "blue" | "gold" = "blue") => {
    try {
      setIsLoadingVerify(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (!token) {
        setError("You need to be signed in to start verification.");
        return;
      }

      const res = await fetch("/api/creator/verify/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          creatorEmail: userEmail,
          userEmail,
          source: "FEED",
          targetId: null,
          tier,
        }),
      });

      const json = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;

      if (!res.ok) {
        setError((json?.error ? String(json.error) : null) || "Could not start verification checkout.");
        return;
      }

      const url = typeof json?.url === "string" ? json.url : "";
      if (url) {
        window.location.href = url;
        return;
      }

      setError("Stripe did not return a checkout URL.");
    } catch (e) {
      console.error("[creator/dashboard] start verify error", e);
      setError("Revolvr glitched out starting verification.");
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

      const fileExt = file.name.split(".").pop() || "bin";
      const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data: storageData, error: storageError } = await supabase.storage.from("posts").upload(filePath, file);

      if (storageError || !storageData) throw storageError ?? new Error("Upload failed");

      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(storageData.path);

      const { data: inserted, error: insertError } = await supabase
        .from(POSTS_TABLE)
        .insert({
          userEmail,
          imageUrl: publicUrl,
          caption: caption.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const insertedPost = isPost(inserted) ? inserted : null;

      setPosts((prev) => (insertedPost ? [insertedPost, ...prev] : prev));
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
      const { error: sbErr } = await supabase.from(POSTS_TABLE).delete().eq("id", id);
      if (sbErr) throw sbErr;
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

      if (credits && credits.boosts > 0) {
        const res = await fetch("/api/credits/spend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorEmail: userEmail, // TEMP: replace with actual creator when available
            userEmail,
            source: "FEED",
            targetId: null,
            email: userEmail,
            kind: "boost",
            postId,
          }),
        });

        const data = (await res.json().catch(() => null)) as
          | { credits?: { boosts?: unknown; tips?: unknown; spins?: unknown }; error?: unknown }
          | null;

        if (!res.ok) {
          console.error("Failed to spend boost credit:", data);
          setError((data?.error ? String(data.error) : null) ?? "Could not spend a boost credit.");
          return;
        }

        if (data?.credits) {
          setCredits({
            boosts: toNumberOrZero(data.credits.boosts),
            tips: toNumberOrZero(data.credits.tips),
            spins: toNumberOrZero(data.credits.spins),
          });
        } else {
          setCredits((prev) => (prev ? { ...prev, boosts: Math.max(0, prev.boosts - 1) } : prev));
        }

        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_boosted: true } : p)));
        return;
      }

      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "boost",
          userEmail,
          amountCents: boostAmountCents,
          postId,
          creatorEmail: userEmail, // self-pay fallback
          source: "FEED",
          targetId: null,
        }),
      });

      if (!res.ok) {
        console.error("Boost checkout failed", await res.text().catch(() => ""));
        setError("Could not start boost payment. Try again.");
        return;
      }

      const data = (await res.json().catch(() => null)) as { url?: unknown } | null;
      const url = typeof data?.url === "string" ? data.url : "";
      if (url) window.location.href = url;
      else setError("Stripe did not return a checkout URL for boost.");
    } catch (err) {
      console.error("Error creating boost checkout:", err);
      setError("Revolvr glitched out starting a boost 😵‍💫");
    }
  };

  // UI guards
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
        <p className="mt-2 text-white/70">Loading your session…</p>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#050816] text-white p-8">
        <h1 className="text-2xl font-semibold">Creator Dashboard</h1>
        <p className="mt-2 text-white/70">Not signed in.</p>
        <a className="underline text-white/80" href="/login?redirectTo=/creator">
  Go to login
</a>
      </div>
    );
  }

  const avatarInitial = userEmail[0]?.toUpperCase() ?? "R";

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
        {/* Left rail */}
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
                  {verificationTier === "gold" ? "Gold Tick active" : "Blue Tick active"}
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
              <button
                onClick={() => setIsComposerOpen(true)}
                className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-medium shadow-lg shadow-emerald-500/25 transition gap-2"
              >
                <RevolvrIcon name="add" size={14} />
                <span>New post</span>
              </button>

              <SpinButton userEmail={userEmail} />

              <button
                type="button"
                onClick={handleConnectStripe}
                disabled={isConnectingStripe}
                className="w-full inline-flex items-center justify-center rounded-full px-4 py-2 bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60 text-xs font-medium"
              >
                {isConnectingStripe ? "Opening Stripe…" : "Set up payouts (Stripe)"}
              </button>
            </div>

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

        {/* Center column */}
        <section className="flex-1 space-y-5">

          {/* Mobile verification actions */}
          <div className="md:hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Verification</div>
              {isVerified ? (
                <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-200">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {verificationTier === "gold" ? "Gold Tick active" : "Blue Tick active"}
                </span>
              ) : null}
            </div>

            {!isVerified ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isLoadingVerify}
                  onClick={() => handleStartBlueTick("blue")}
                  className="inline-flex items-center justify-center text-xs px-3 py-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60"
                >
                  {isLoadingVerify ? "Starting…" : "Get Blue Tick (Recurring)"}
                </button>

                <button
                  type="button"
                  disabled={isLoadingVerify}
                  onClick={() => handleStartBlueTick("gold")}
                  className="inline-flex items-center justify-center text-xs px-3 py-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 disabled:opacity-60"
                >
                  {isLoadingVerify ? "Starting…" : "Get Gold Tick (Recurring)"}
                </button>
              </div>
            ) : null}
          </div>
          {notice && (
            <div className="rounded-xl bg-white/10 text-white text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-black/20">
              <span>{notice}</span>
              <button className="text-xs underline" onClick={() => setNotice(null)}>
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 text-red-200 text-sm px-3 py-2 flex justify-between items-center shadow-sm shadow-red-500/20">
              <span>{error}</span>
              <button className="text-xs underline" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          )}

          {isLoadingPosts ? (
            <div className="text-sm text-white/70">Loading the feed…</div>
          ) : posts.length === 0 ? (
            <div className="text-sm text-white/70">No posts yet. Be the first to spin something into existence ✨</div>
          ) : (
            <div className="space-y-6 pb-12">
              {posts.map((post) => {
                const displayName = (() => {
                  if (!post.userEmail) return "Someone";
                  const [localPart] = post.userEmail.split("@");
                  const cleaned = localPart.replace(/\W+/g, " ").trim();
                  return cleaned || post.userEmail;
                })();

                const isAuthorVerified = verifiedMap[String(post.userEmail || "").toLowerCase()] === true;

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                          {(post.userEmail ?? "R")[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-[220px]">
                            {displayName}
                            {isAuthorVerified ? (
                              <span className="ml-1 inline-flex align-middle">
                                <VerifiedBadge />
                              </span>
                            ) : null}
                          </span>
                          <span className="text-[11px] text-white/40">{new Date(post.createdAt).toLocaleString()}</span>
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

                    <div className="relative w-full max-h-[480px]">
  {_isVideoUrl(post.imageUrl) ? (
    <video
      src={post.imageUrl}
      controls
      className="w-full max-h-[480px] object-cover"
    />
  ) : (
    <Image
      src={post.imageUrl}
      alt={post.caption || "Post media"}
      width={1200}
      height={800}
      unoptimized
      className="w-full max-h-[480px] object-cover"
    />
  )}
</div>


                    {post.caption && <p className="px-4 py-3 text-sm text-white/90">{post.caption}</p>}

                    <PaidReactionBar
                      postId={post.id}
                      viewerEmail={userEmail}
                      disabled={credits ? credits.tips <= 0 : false}
                      onSuccess={() => {
                        setCredits((prev) => (prev ? { ...prev, tips: Math.max(0, prev.tips - 1) } : prev));
                      }}
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Composer */}
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
              <div>
                <label className="text-xs font-medium text-white/70 block mb-2">Image or short video</label>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0] ?? null;
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
                    <div className="w-full h-full overflow-hidden rounded-lg relative">
                      {file.type.startsWith("video") ? (
                        <video src={URL.createObjectURL(file)} controls className="w-full h-full object-cover" />
                      ) : (
                        <Image
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          width={900}
                          height={600}
                          unoptimized
                          className="w-full h-full object-cover"
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
