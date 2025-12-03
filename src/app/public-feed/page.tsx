"use client";

import { useEffect, useMemo, useState } from "react";
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

  // -------- Load current user -----------------------
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);
    };

    fetchUser();
  }, []);

  // -------- Load posts ------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPosts(
          (data ?? []).map((p: any) => ({
            ...p,
            reactions: {},
          }))
        );
      } catch (err) {
        setError("Error loading feed");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  // -------- Make sure user is logged in --------------
  const ensureLoggedIn = () => {
    if (!userEmail) {
      router.push("/login?redirectTo=/public-feed");
      return false;
    }
    return true;
  };

  // -------- Reaction (local only) --------------------
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

  // -------- Start Stripe payment ---------------------
  const startPayment = async (
    mode: PurchaseMode,
    postId: string,
    amountCents: number
  ) => {
    if (!ensureLoggedIn()) return;

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

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError("Stripe checkout failed.");
    }
  };

  // -------- Open popup -------------------------------
  const openChoice = (postId: string, mode: PurchaseMode) => {
    if (!ensureLoggedIn()) return;
    setPendingPurchase({ postId, mode });
  };

  const handleSingle = async () => {
    if (!pendingPurchase) return;
    const { postId, mode } = pendingPurchase;

    const price =
      mode === "tip" ? 200 : mode === "boost" ? 500 : 100; // A$2 / A$5 / A$1

    await startPayment(mode, postId, price);
    setPendingPurchase(null);
  };

  const handlePack = () => {
    if (!pendingPurchase) return;
    router.push(`/credits?mode=${pendingPurchase.mode}`);
    setPendingPurchase(null);
  };

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col">

      {/* -------- Top bar -------- */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#050814]/80 backdrop-blur flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Revolvr</span>
          <span>🔥</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/credits"
            className="px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200"
          >
            Buy packs
          </Link>

          <Link
            href="/login?redirectTo=/public-feed"
            className="px-3 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* -------- Main -------- */}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-xl px-3 py-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <h1 className="text-lg font-semibold">Public feed</h1>

          {/* Loading */}
          {isLoading ? (
            <div className="text-center text-white/60 py-10">
              Loading the chaos…
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center text-white/60 py-10">
              No posts yet.
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {posts.map((post) => (
                <PublicPostCard
                  key={post.id}
                  post={post}
                  onReact={handleReact}
                  onTip={(id) => openChoice(id, "tip")}
                  onBoost={(id) => openChoice(id, "boost")}
                  onSpin={(id) => openChoice(id, "spin")}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* -------- Popup -------- */}
      {pendingPurchase && (
        <PurchaseChoiceSheet
          pending={pendingPurchase}
          onClose={() => setPendingPurchase(null)}
          onSingle={handleSingle}
          onPack={handlePack}
        />
      )}
    </div>
  );
}

//
// -------------------------------------------------------------
// POST CARD
// -------------------------------------------------------------
//

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Animation class randomizer
  const animationClass = useMemo(() => {
    const arr = ["rv-spin-in", "rv-bounce-in", "rv-jolt-in", "rv-slide-in"];
    return arr[Math.floor(Math.random() * arr.length)];
  }, []);

  const created = new Date(post.created_at);
  const timeLabel = useMemo(() => {
    const s = Math.floor((Date.now() - created.getTime()) / 1000);
    if (s < 60) return "Just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }, [created]);

  const isVideo = post.image_url?.match(/\.(mp4|webm|ogg)$/i);

  return (
    <article className="rounded-2xl bg-[#070b1b] border border-white/10 p-4 shadow-md shadow-black/30">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
          {post.user_email?.[0] ?? "R"}
        </div>
        <div>
          <div className="text-sm truncate max-w-[200px]">{post.user_email}</div>
          <div className="text-[11px] text-white/40">{timeLabel}</div>
        </div>
      </div>

      {/* Media */}
      <div
        className={`overflow-hidden rounded-xl bg-black/40 ${
          mounted ? animationClass : ""
        }`}
      >
        {isVideo ? (
          <video
            src={post.image_url}
            controls
            playsInline
            className="w-full h-auto"
          />
        ) : (
          <img
            src={post.image_url}
            alt={post.caption}
            className="w-full h-auto"
          />
        )}
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="mt-2 text-sm text-white/90">{post.caption}</div>
      )}

      {/* Payments */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onTip(post.id)}
          className="px-3 py-1.5 text-[11px] rounded-full bg-emerald-500/10 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/20"
        >
          Tip A$2
        </button>

        <button
          onClick={() => onBoost(post.id)}
          className="px-3 py-1.5 text-[11px] rounded-full bg-indigo-500/10 border border-indigo-400/60 text-indigo-200 hover:bg-indigo-500/20"
        >
          Boost A$5
        </button>

        <button
          onClick={() => onSpin(post.id)}
          className="px-3 py-1.5 text-[11px] rounded-full bg-pink-500/10 border border-pink-400/60 text-pink-200 hover:bg-pink-500/20"
        >
          Spin A$1
        </button>
      </div>

      {/* Reactions */}
      <div className="mt-3 flex gap-2">
        {REACTION_EMOJIS.map((emoji) => {
          const count = post.reactions?.[emoji] ?? 0;
          return (
            <button
              key={emoji}
              onClick={() => onReact(post.id, emoji)}
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-lg flex items-center justify-center"
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="ml-1 text-[11px] text-white/60">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </article>
  );
}

//
// -------------------------------------------------------------
// PURCHASE POPUP
// -------------------------------------------------------------
//

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
  const mode = pending.mode;
  const label = mode === "tip" ? "Tip" : mode === "boost" ? "Boost" : "Spin";
  const singlePrice =
    mode === "tip" ? "A$2" : mode === "boost" ? "A$5" : "A$1";

  const packLabel =
    mode === "tip"
      ? "Tip pack"
      : mode === "boost"
      ? "Boost pack"
      : "Spin pack";

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-30">
      <div className="w-full max-w-sm bg-[#070b1b] border border-white/10 rounded-2xl mb-6 p-4 shadow-xl shadow-black/50 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Support this post with a {label}
          </h2>
          <button
            onClick={onClose}
            className="text-xs text-white/50 hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="text-xs text-white/60">
          Choose a one-off {label.toLowerCase()} or grab a pack for better
          value.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onSingle}
            className="rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/50 px-3 py-2 text-left text-xs"
          >
            <div className="font-semibold">
              Single {label} ({singlePrice})
            </div>
            <div className="text-[11px] text-emerald-200/80">
              Quick one-off support
            </div>
          </button>

          <button
            onClick={onPack}
            className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-2 text-left text-xs"
          >
            <div className="font-semibold">Buy {packLabel}</div>
            <div className="text-[11px] text-white/70">
              Better value, more {label.toLowerCase()}s
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-[11px] text-white/40 hover:text-white/70"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
