"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostActionModal, { type Preset } from "@/components/PostActionModal";
import { createCheckout } from "@/lib/actionsClient";
import Link from "next/link";

type Verification = "blue" | "gold" | null;

export type ProfilePost = {
  id: string;
  imageUrl: string;
  mediaType: string;
  caption: string | null;
  createdAt: string; // ISO
};

export type ProfileClientProps = {
  email: string;
  displayName: string;
  handle: string | null;
  verification: Verification;
  trustLine: string | null;
  avatarUrl: string | null;
  bio: string | null;
  posts: ProfilePost[];
};

type Mode = "tip" | "boost" | "spin";

type Meta = {
  title: string;
  subtitle: string;
  icon: string;
  presets: Preset[];
  defaultAmountCents: number;
  confirmLabel: string;
};

function metaFor(mode: Mode): Meta {
  switch (mode) {
    case "tip":
      return {
        title: "Tip",
        subtitle: "Support this profile",
        icon: "💰",
        presets: [
          { label: "A$1.50", amountCents: 150 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 150,
        confirmLabel: "Tip",
      };
    case "boost":
      return {
        title: "Boost",
        subtitle: "Boost this post",
        icon: "⚡",
        presets: [
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
          { label: "A$25.00", amountCents: 2500 },
          { label: "A$50.00", amountCents: 5000 },
        ],
        defaultAmountCents: 1000,
        confirmLabel: "Boost",
      };
    case "spin":
      return {
        title: "Spin",
        subtitle: "Spin the Revolvr",
        icon: "🌀",
        presets: [
          { label: "A$1.00", amountCents: 100 },
          { label: "A$2.00", amountCents: 200 },
          { label: "A$5.00", amountCents: 500 },
          { label: "A$10.00", amountCents: 1000 },
        ],
        defaultAmountCents: 200,
        confirmLabel: "Spin",
      };
  }
}

function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return iso.slice(0, 7);
  }
}

type MeResponse = {
  loggedIn: boolean;
  user?: { email?: string | null };
  creator?: { verificationTier?: "blue" | "gold" | null };
};

function ActionPill({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-white/15 bg-black/30 backdrop-blur px-3 py-1.5 text-xs text-white/90 hover:bg-black/40 disabled:opacity-50"
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}

function PostModal({
  open,
  onClose,
  post,
  profileEmail,
  viewerEmail,
}: {
  open: boolean;
  onClose: () => void;
  post: ProfilePost | null;
  profileEmail: string;
  viewerEmail: string | null;
}) {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);
  const [busy, setBusy] = useState(false);

  const activeMeta = useMemo(() => {
    if (!activeMode) return null;
    return metaFor(activeMode);
  }, [activeMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isAuthed = Boolean(viewerEmail);
  const canCheckout = Boolean(viewerEmail && profileEmail && post?.id);

  const returnPath =
    typeof window !== "undefined"
      ? window.location.pathname
      : `/u/${encodeURIComponent(profileEmail)}`;

  const loginHref = `/login?redirectTo=${encodeURIComponent(returnPath)}`;

  async function begin(mode: Mode, amountCents: number) {
    if (!post?.id) return;
    if (!viewerEmail) return;
    setBusy(true);
    try {
      const { url } = await createCheckout({
        mode,
        creatorEmail: profileEmail,
        userEmail: viewerEmail,
        postId: post.id,
        source: "FEED",
        returnPath,
        amountCents,
      });
      window.location.href = url;
    } finally {
      setBusy(false);
    }
  }

  if (!open || !post) return null;

  const created = formatMonthYear(post.createdAt);

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-3xl px-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="rounded-3xl border border-white/10 bg-black/80 backdrop-blur overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{profileEmail}</div>
              <div className="text-[11px] text-white/60">
                {created ? `Posted ${created}` : "Post"}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              Close
            </button>
          </div>

          {/* Media */}
          <div className="bg-black">
            {post.imageUrl && post.mediaType?.startsWith("video") ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={post.imageUrl}
                controls
                playsInline
                className="w-full max-h-[70vh] object-contain bg-black"
              />
            ) : post.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt=""
                className="w-full max-h-[70vh] object-contain bg-black"
              />
            ) : null}
          </div>

          {/* Caption */}
          {post.caption ? (
            <div className="px-4 py-3 text-sm text-white/90 border-t border-white/10 whitespace-pre-wrap">
              {post.caption}
            </div>
          ) : null}

          {/* Actions */}
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ActionPill
                icon="💰"
                label="Tip"
                disabled={!canCheckout}
                onClick={() => setActiveMode("tip")}
              />
              <ActionPill
                icon="⚡"
                label="Boost"
                disabled={!canCheckout}
                onClick={() => setActiveMode("boost")}
              />
              <ActionPill
                icon="🌀"
                label="Spin"
                disabled={!canCheckout}
                onClick={() => setActiveMode("spin")}
              />
            </div>
            <div className="text-[11px] text-white/50">
              {isAuthed ? "Payments via Stripe" : "Sign in to support"}
            </div>
          </div>
        </div>
      </div>

      <PostActionModal
        open={Boolean(activeMode && activeMeta)}
        onClose={() => setActiveMode(null)}
        title={activeMeta?.title ?? ""}
        subtitle={activeMeta?.subtitle}
        icon={activeMeta?.icon}
        isAuthed={isAuthed}
        loginHref={loginHref}
        presets={activeMeta?.presets}
        defaultAmountCents={activeMeta?.defaultAmountCents}
        confirmLabel={activeMeta?.confirmLabel}
        allowCustom={true}
        busy={busy}
        currency={"aud"}
        onConfirm={async (amountCents) => {
          if (!activeMode) return;
          await begin(activeMode, amountCents);
        }}
      />
    </div>
  );
}

export default function ProfileClient(props: ProfileClientProps) {
  const { email, displayName, handle, verification, trustLine, avatarUrl, bio, posts } =
    props;

  const [viewerEmail, setViewerEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProfilePost | null>(null);

  // Hamburger menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  useEffect(() => {
    fetch("/api/creator/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (data?.loggedIn) {
          setViewerEmail((data.user?.email ?? null)?.toLowerCase() ?? null);
        }
      })
      .catch(() => null);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <a href="/feed" className="text-sm text-white/70 hover:text-white">
          ← Back to feed
        </a>
        <div className="text-sm text-white/60">Profile</div>

        {/* Hamburger (top right) */}
        <div ref={menuRef} className="relative w-[92px] flex justify-end">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 flex items-center justify-center"
            aria-label="Menu"
          >
            <span className="text-xl leading-none">≡</span>
          </button>

          {menuOpen && (
  <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-black/90 backdrop-blur p-2 shadow-xl">
    <Link
      href="/me"
      className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10"
      onClick={() => setMenuOpen(false)}
    >
      Account
    </Link>

    <Link
      href="/terms"
      className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10"
      onClick={() => setMenuOpen(false)}
    >
      Terms &amp; Conditions
    </Link>
  </div>
)}


      {/* Header */}
      <div className="mt-8 flex items-start gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-white/10 flex items-center justify-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="text-lg font-semibold text-white/70">
              {displayName?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold truncate">{displayName}</h1>

            {verification === "gold" && (
              <span
                title="Verified business"
                className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-200 border border-yellow-300/20"
              >
                ✓ GOLD
              </span>
            )}

            {verification === "blue" && (
              <span
                title="Verified individual"
                className="inline-flex items-center gap-1 rounded-full bg-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-300/20"
              >
                ✓ BLUE
              </span>
            )}
          </div>

          <div className="mt-1 text-sm text-white/60">
            {handle ? <span className="mr-2">{handle}</span> : null}
            <span className="truncate">{email}</span>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      {trustLine ? (
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-sm text-white/75">
          {trustLine}
        </div>
      ) : null}

      {/* Bio */}
      {bio ? (
        <div className="mt-6 rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
          <div className="text-sm text-white/90 whitespace-pre-wrap">{bio}</div>
        </div>
      ) : null}

      {/* Grid */}
      <div className="mt-8">
        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-10 text-center text-white/60">
            No posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelected(post)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <div className="aspect-square w-full">
                  {post.imageUrl && post.mediaType?.startsWith("video") ? (
                    <div className="h-full w-full flex items-center justify-center bg-black/40">
                      <div className="text-xs text-white/70">Video</div>
                    </div>
                  ) : post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <div className="text-xs text-white/50">No media</div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <PostModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        post={selected}
        profileEmail={email}
        viewerEmail={viewerEmail}
      />
    </div>
  );
}
