// src/app/public-feed/PublicFeedClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import FeedLayout from "@/components/FeedLayout";
import PeopleRail, { type PersonRailItem } from "@/components/PeopleRail";
import PostActionModal from "@/components/PostActionModal";
import { createCheckout, type CheckoutMode } from "@/lib/actionsClient";

type Post = {
  id: string;
  userEmail: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
};

type PostsResponseShape = { posts?: unknown };
type VerifiedResponseShape = { verified?: unknown; currencies?: unknown };
type ErrorResponseShape = { error?: unknown };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasPostsArray(v: unknown): v is PostsResponseShape {
  return isRecord(v) && "posts" in v;
}
function hasVerifiedArray(v: unknown): v is VerifiedResponseShape {
  return isRecord(v) && "verified" in v;
}
function hasErrorMessage(v: unknown): v is ErrorResponseShape {
  return isRecord(v) && "error" in v;
}

function normalizePosts(rows: unknown): Post[] {
  if (!Array.isArray(rows)) return [];
  return rows as Post[];
}
function normalizeVerifiedEmails(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).toLowerCase());
}

function normalizeCurrencyMap(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    const email = String(k).trim().toLowerCase();
    const cur = String(val ?? "aud").trim().toLowerCase();
    if (email) out[email] = cur || "aud";
  }
  return out;
}

const VerifiedBadge = () => (
  <span
    title="Verified creator"
    className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] ml-1"
    aria-label="Verified"
  >
    ✓
  </span>
);

function displayNameFromEmail(email: string) {
  const [localPart] = String(email || "").split("@");
  const cleaned = localPart.replace(/\W+/g, " ").trim();
  return cleaned || email;
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("/");
}

function formatMoneyFromCents(amountCents: number, currency: string) {
  const cur = String(currency || "aud").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amountCents / 100);
  } catch {
    return `${cur} ${(amountCents / 100).toFixed(2)}`;
  }
}

function FooterAction({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-none inline-flex items-center justify-center",
        "flex-col sm:flex-row",
        "gap-1 sm:gap-2",
        "rounded-lg px-2 py-2",
        "text-[11px] sm:text-xs text-white/60",
        "transition-all duration-150",
        "hover:text-white hover:bg-white/5",
        "active:scale-[0.97] active:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
      ].join(" ")}
      aria-label={label}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

type ActionMode = Extract<CheckoutMode, "tip" | "boost" | "spin" | "reaction" | "vote">;

type ActiveAction = {
  postId: string;
  mode: ActionMode;
};

type Preset = { label: string; amountCents: number };

type ActionMeta = {
  title: string;
  subtitle?: string;
  icon?: string;
  allowCustom: boolean;
  presetsCents: number[];
  defaultAmountCents: number;
  confirmLabel: string;
};

function actionMeta(mode: ActionMode): ActionMeta {
  switch (mode) {
    case "tip":
      return {
        title: "Tip creator",
        subtitle: "Support this creator",
        icon: "💰",
        allowCustom: true,
        presetsCents: [200, 500, 1000, 2500],
        defaultAmountCents: 500,
        confirmLabel: "Tip",
      };

    case "boost":
      return {
        title: "Boost post",
        subtitle: "Boost this post",
        icon: "⚡",
        allowCustom: true,
        presetsCents: [500, 1000, 2500, 5000],
        defaultAmountCents: 1000,
        confirmLabel: "Boost",
      };

    case "spin":
      return {
        title: "Spin",
        subtitle: "Spin the Revolvr",
        icon: "🌀",
        allowCustom: true,
        presetsCents: [100, 200, 500, 1000],
        defaultAmountCents: 200,
        confirmLabel: "Spin",
      };

    case "reaction":
      return {
        title: "Reaction",
        subtitle: "Send a paid reaction",
        icon: "😊",
        allowCustom: true,
        presetsCents: [100, 200, 300, 500],
        defaultAmountCents: 100,
        confirmLabel: "React",
      };

    case "vote":
      return {
        title: "Vote",
        subtitle: "Cast a paid vote",
        icon: "🗳",
        allowCustom: true,
        presetsCents: [100, 200, 500, 1000],
        defaultAmountCents: 100,
        confirmLabel: "Vote",
      };
  }
}

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());
  const [currencyByEmail, setCurrencyByEmail] = useState<Record<string, string>>({});

  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);

  const [returnBanner, setReturnBanner] = useState<
    { type: "success" | "cancel"; mode: string; targetId?: string } | null
  >(null);

  const [brokenPostImages, setBrokenPostImages] = useState<Record<string, boolean>>({});

  const emails = useMemo(() => {
    const s = new Set<string>();
    for (const p of posts) {
      const e = String(p.userEmail || "").trim().toLowerCase();
      if (e) s.add(e);
    }
    return Array.from(s);
  }, [posts]);

  const railItems: PersonRailItem[] = useMemo(() => {
    const seen = new Set<string>();
    const out: PersonRailItem[] = [];

    for (const p of posts) {
      const email = String(p.userEmail || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);

      out.push({
        email,
        imageUrl: isValidImageUrl(p.imageUrl) ? p.imageUrl : null,
        displayName: displayNameFromEmail(email),
        tick: verifiedSet.has(email) ? "blue" : null,
      });

      if (out.length >= 20) break;
    }

    return out;
  }, [posts, verifiedSet]);

  // Stripe return banner
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const success = url.searchParams.get("success") === "1";
      const canceled = url.searchParams.get("canceled") === "1";
      const mode = url.searchParams.get("mode") || "";
      const targetId = url.searchParams.get("targetId") || undefined;

      if (success || canceled) {
        setReturnBanner({
          type: success ? "success" : "cancel",
          mode,
          targetId,
        });

        url.searchParams.delete("success");
        url.searchParams.delete("canceled");
        url.searchParams.delete("mode");
        url.searchParams.delete("targetId");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      // no-op
    }
  }, []);

  // Load posts
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/posts", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          const msg =
            hasErrorMessage(json) && typeof (json as ErrorResponseShape).error === "string"
              ? String((json as ErrorResponseShape).error)
              : `Failed to load posts (${res.status})`;

          if (!cancelled) {
            setErr(msg);
            setPosts([]);
          }
          return;
        }

        const rows = Array.isArray(json)
          ? json
          : hasPostsArray(json)
            ? (json as PostsResponseShape).posts ?? []
            : [];

        if (!cancelled) setPosts(normalizePosts(rows));
      } catch (e: unknown) {
        console.error("[public-feed] load posts error", e);
        if (!cancelled) {
          setErr("Failed to load public feed.");
          setPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load verified + currency map for authors
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!emails.length) {
          if (!cancelled) {
            setVerifiedSet(new Set());
            setCurrencyByEmail({});
          }
          return;
        }

        const batch = emails.slice(0, 200);
        const qs = encodeURIComponent(batch.join(","));

        const res = await fetch(`/api/creator/verified?emails=${qs}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as unknown;

        if (!res.ok) {
          console.warn("[public-feed] verified lookup failed", res.status, json);
          return;
        }

        const verifiedRaw = hasVerifiedArray(json)
          ? (json as VerifiedResponseShape).verified ?? []
          : [];
        const verified = normalizeVerifiedEmails(verifiedRaw);

        const currenciesRaw = isRecord(json) && "currencies" in json ? (json as any).currencies : undefined;
        const currencies = normalizeCurrencyMap(currenciesRaw);

        if (!cancelled) {
          setVerifiedSet(new Set(verified));
          setCurrencyByEmail(currencies);
        }
      } catch (e: unknown) {
        console.warn("[public-feed] verified lookup error", e);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [emails]);

  const activePost = useMemo(() => {
    if (!activeAction) return null;
    return posts.find((p) => p.id === activeAction.postId) ?? null;
  }, [activeAction, posts]);

  const activeCreatorEmail = useMemo(() => {
    return String(activePost?.userEmail ?? "").trim().toLowerCase();
  }, [activePost]);

  const activeCurrency = useMemo(() => {
    const e = String(activeCreatorEmail || "").toLowerCase();
    return currencyByEmail[e] ?? "aud";
  }, [activeCreatorEmail, currencyByEmail]);

  const activeMeta = useMemo(() => {
    if (!activeAction) return null;
    return actionMeta(activeAction.mode);
  }, [activeAction]);

  const activePresets: Preset[] = useMemo(() => {
    if (!activeMeta) return [{ label: formatMoneyFromCents(100, activeCurrency), amountCents: 100 }];
    return activeMeta.presetsCents.map((c) => ({
      amountCents: c,
      label: formatMoneyFromCents(c, activeCurrency),
    }));
  }, [activeMeta, activeCurrency]);

  async function beginCheckout(
  mode: ActionMode,
  postId: string,
  creatorEmail: string,
  amountCents: number
) {
  const { url } = await createCheckout({
    mode,
    creatorEmail,          // ✅ POST AUTHOR EMAIL
    userEmail: null,       // viewer (optional)
    targetId: postId,
    postId,
    source: "FEED",
    returnPath: "/public-feed",
    amountCents,
  });

  window.location.href = url;
}


  return (
    <FeedLayout title="Revolvr" subtitle="Public feed">
      <div className="space-y-6">
        <PeopleRail items={railItems} size={84} revolve />

        {returnBanner ? (
          <div
            className={[
              "rounded-xl border px-3 py-2 text-sm",
              returnBanner.type === "success"
                ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-200"
                : "bg-white/5 border-white/10 text-white/70",
            ].join(" ")}
          >
            {returnBanner.type === "success"
              ? `Payment successful${returnBanner.mode ? ` (${returnBanner.mode})` : ""}.`
              : `Payment canceled${returnBanner.mode ? ` (${returnBanner.mode})` : ""}.`}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-white/70">Loading public feed…</div>
        ) : err ? (
          <div className="rounded-xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-3 py-2">
            {err}
          </div>
        ) : !posts.length ? (
          <div className="text-sm text-white/70">No posts yet.</div>
        ) : (
          <div className="space-y-6 pb-12">
            {posts.map((post) => {
              const email = String(post.userEmail || "").trim().toLowerCase();
              const isVerified = email ? verifiedSet.has(email) : false;
              const showFallback = brokenPostImages[post.id] || !isValidImageUrl(post.imageUrl);

              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-lg shadow-black/40"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300 uppercase">
                        {(email || "r")[0].toUpperCase()}
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[180px] sm:max-w-[240px] inline-flex items-center">
                          {displayNameFromEmail(email)}
                          {isVerified ? <VerifiedBadge /> : null}
                        </span>
                        <span className="text-[11px] text-white/40">
                          {post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>

                    <Link href={`/u/${encodeURIComponent(email)}`} className="text-xs text-white/60 hover:text-white underline">
                      View
                    </Link>
                  </div>

                  {/* Media */}
                  <div className="relative w-full max-h-[520px]">
                    {showFallback ? (
                      <div className="w-full h-[320px] sm:h-[420px] bg-white/5 border-t border-white/10 flex items-center justify-center">
                        <span className="text-xs text-white/50">Image unavailable</span>
                      </div>
                    ) : (
                      <Image
                        src={post.imageUrl}
                        alt={post.caption || "post"}
                        width={1200}
                        height={800}
                        unoptimized
                        className="w-full max-h-[520px] object-cover"
                        onError={() =>
                          setBrokenPostImages((prev) => ({
                            ...prev,
                            [post.id]: true,
                          }))
                        }
                      />
                    )}
                  </div>

                  {/* Post footer actions */}
                  <div className="px-4 py-2 border-t border-white/10">
                    <div className="hidden sm:flex">
                      <div className="inline-flex items-center gap-10">
                        <FooterAction label="Tip" icon="💰" onClick={() => setActiveAction({ postId: post.id, mode: "tip" })} />
                        <FooterAction
                          label="Boost"
                          icon="⚡"
                          onClick={() => setActiveAction({ postId: post.id, mode: "boost" })}
                        />
                        <FooterAction label="Spin" icon="🌀" onClick={() => setActiveAction({ postId: post.id, mode: "spin" })} />
                        <FooterAction
                          label="React"
                          icon="😊"
                          onClick={() => setActiveAction({ postId: post.id, mode: "reaction" })}
                        />
                        <FooterAction label="Vote" icon="🗳" onClick={() => setActiveAction({ postId: post.id, mode: "vote" })} />
                      </div>
                    </div>

                    <div className="grid sm:hidden grid-cols-5 items-center justify-items-center gap-x-2">
                      <FooterAction label="Tip" icon="💰" onClick={() => setActiveAction({ postId: post.id, mode: "tip" })} />
                      <FooterAction
                        label="Boost"
                        icon="⚡"
                        onClick={() => setActiveAction({ postId: post.id, mode: "boost" })}
                      />
                      <FooterAction label="Spin" icon="🌀" onClick={() => setActiveAction({ postId: post.id, mode: "spin" })} />
                      <FooterAction
                        label="React"
                        icon="😊"
                        onClick={() => setActiveAction({ postId: post.id, mode: "reaction" })}
                      />
                      <FooterAction label="Vote" icon="🗳" onClick={() => setActiveAction({ postId: post.id, mode: "vote" })} />
                    </div>
                  </div>

                  {/* Caption */}
                  {post.caption ? <p className="px-4 py-3 text-sm text-white/90">{post.caption}</p> : null}
                </article>
              );
            })}
          </div>
        )}

        {/* One global modal inside FeedLayout */}
        <PostActionModal
          open={Boolean(activeAction && activePost && activeMeta)}
          onClose={() => setActiveAction(null)}
          title={activeMeta?.title ?? "Action"}
          subtitle={activeMeta?.subtitle ?? ""}
          icon={activeMeta?.icon ?? "✨"}
          isAuthed={true}
          loginHref="/login"
          allowCustom={activeMeta?.allowCustom ?? true}
          presets={activePresets}
          defaultAmountCents={activeMeta?.defaultAmountCents ?? 100}
          confirmLabel={activeMeta?.confirmLabel ?? "Confirm"}
          currency={activeCurrency}
          onConfirm={async (amountCents) => {
            if (!activeAction || !activePost || !activeCreatorEmail) return;
            await beginCheckout(
  activeAction.mode,
  activePost.id,
  activePost.userEmail, // ✅ creator
  amountCents
);

          }}
        />
      </div>
    </FeedLayout>
  );
}
