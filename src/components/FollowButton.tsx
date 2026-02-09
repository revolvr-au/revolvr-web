"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  followingEmail: string;
  className?: string;
  size?: "sm" | "md";
};

export default function FollowButton({ followingEmail, className, size = "sm" }: Props) {
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [ready, setReady] = useState(false);

  const label = useMemo(() => {
    if (!ready) return "…";
    if (loading) return "…";
    return isFollowing ? "Following" : "Follow";
  }, [ready, loading, isFollowing]);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/follow/status?profileEmail=${encodeURIComponent(followingEmail)}`,
        { cache: "no-store" }
      );
      if (res.status === 401) {
        setIsFollowing(false);
        setReady(true);
        return;
      }
      const json = await res.json();
      setIsFollowing(Boolean(json?.isFollowing));
      setReady(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followingEmail]);

  async function toggle() {
    if (loading) return;
    setLoading(true);

    // optimistic
    const next = !isFollowing;
    setIsFollowing(next);

    try {
      const res = await fetch("/api/follow", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingEmail }),
      });

      if (res.status === 401) {
        // revert if not authed
        setIsFollowing(!next);
        return;
      }
      if (!res.ok && res.status !== 409) {
        // revert on failure (409 for already following is fine)
        setIsFollowing(!next);
      }
    } finally {
      setLoading(false);
    }
  }

  const pad = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const base =
    "rounded-full border transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
  const on =
    "bg-white/10 border-white/15 hover:bg-white/15";
  const off =
    "bg-emerald-500/90 border-emerald-400/30 hover:bg-emerald-500 text-black font-semibold";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || !followingEmail}
      className={[base, pad, isFollowing ? on : off, className].filter(Boolean).join(" ")}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
    >
      {label}
    </button>
  );
}
