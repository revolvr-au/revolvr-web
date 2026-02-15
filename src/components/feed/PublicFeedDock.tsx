"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ActionMode = "tip" | "boost" | "spin" | "reaction" | "vote";

type PostLite = { id: string };

export default function PublicFeedDock({
  activePostId,
  likeCount,
  liked,
  onToggleLike,
  onOpenComments,
  onShare,
  onOpenReward,
}: {
  activePostId: string | null;
  likeCount: number;
  liked: boolean;
  onToggleLike: (postId: string) => void;
  onOpenComments: (postId: string) => void;
  onShare: (postId: string) => void;
  onOpenReward: (mode: ActionMode, postId: string) => void;
}) {
  const [rewardOpen, setRewardOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);

  const pressTimer = useRef<number | null>(null);

  const canAct = Boolean(activePostId);

  useEffect(() => {
    // close menus if no active post
    if (!activePostId) {
      setRewardOpen(false);
      setReactionOpen(false);
    }
  }, [activePostId]);

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  function onLikePointerDown() {
    if (!activePostId) return;
    clearPress();
    // long-press opens reactions tray (NOT a second like icon)
    pressTimer.current = window.setTimeout(() => {
      setReactionOpen(true);
    }, 320);
  }

  function onLikePointerUp() {
    if (!activePostId) return;

    // If long-press already fired, do nothing on release.
    const hadTimer = Boolean(pressTimer.current);
    clearPress();

    // Quick tap toggles like.
    // (If the long press triggered, reactionOpen would be true; we don’t toggle like.)
    if (hadTimer && !reactionOpen) {
      onToggleLike(activePostId);
    }
  }

  function chooseReaction(emoji: string) {
    // placeholder for now: wire to /api/reactions later
    // For now, just close tray (you can toast it if you want).
    setReactionOpen(false);
  }

  const rewardItems: { mode: ActionMode; label: string; icon: string }[] = useMemo(
    () => [
      { mode: "tip", label: "React", icon: "🌼" },
      { mode: "boost", label: "Highlight", icon: "⭐" },
      { mode: "spin", label: "Pulse", icon: "💫" },
      { mode: "reaction", label: "Bloom", icon: "🌸" },
      { mode: "vote", label: "Signal", icon: "🐝" },
    ],
    []
  );

  return (
    <>
      {/* RIGHT ACTION STACK */}
      <div className="fixed right-3 bottom-28 z-50 flex flex-col items-center gap-3 select-none">
        <button
          type="button"
          disabled={!canAct}
          onPointerDown={onLikePointerDown}
          onPointerUp={onLikePointerUp}
          onPointerCancel={clearPress}
          className={[
            "w-12 h-12 rounded-full border border-white/10 bg-black/35 backdrop-blur",
            "flex items-center justify-center",
            "active:scale-[0.98] transition",
            !canAct ? "opacity-40 cursor-not-allowed" : "hover:bg-black/45",
          ].join(" ")}
          aria-label="Like"
          title="Tap to like. Press and hold for reactions."
        >
          <span className="text-lg leading-none">{liked ? "❤️" : "🤍"}</span>
        </button>
        <div className="text-[11px] text-white/60 -mt-2">{likeCount}</div>

        <button
          type="button"
          disabled={!canAct}
          onClick={() => activePostId && onOpenComments(activePostId)}
          className={[
            "w-12 h-12 rounded-full border border-white/10 bg-black/35 backdrop-blur",
            "flex items-center justify-center",
            "active:scale-[0.98] transition",
            !canAct ? "opacity-40 cursor-not-allowed" : "hover:bg-black/45",
          ].join(" ")}
          aria-label="Comments"
          title="Comments"
        >
          <span className="text-lg leading-none">💬</span>
        </button>

        <button
          type="button"
          disabled={!canAct}
          onClick={() => activePostId && onShare(activePostId)}
          className={[
            "w-12 h-12 rounded-full border border-white/10 bg-black/35 backdrop-blur",
            "flex items-center justify-center",
            "active:scale-[0.98] transition",
            !canAct ? "opacity-40 cursor-not-allowed" : "hover:bg-black/45",
          ].join(" ")}
          aria-label="Share"
          title="Share"
        >
          <span className="text-lg leading-none">↗</span>
        </button>
      </div>

      {/* BOTTOM-LEFT REWARD BUTTON */}
      <div className="fixed left-3 bottom-28 z-50">
        <button
          type="button"
          disabled={!canAct}
          onClick={() => setRewardOpen((p) => !p)}
          className={[
            "rounded-full px-4 py-3 border border-white/10 bg-black/35 backdrop-blur",
            "inline-flex items-center gap-2",
            "active:scale-[0.98] transition",
            !canAct ? "opacity-40 cursor-not-allowed" : "hover:bg-black/45",
          ].join(" ")}
          aria-label="Reward"
          title="Reward"
        >
          <span className="text-lg leading-none">🎁</span>
          <span className="text-sm font-semibold text-white">Reward</span>
        </button>

        {/* Reward tray */}
        {rewardOpen && canAct ? (
          <div className="mt-2 w-56 rounded-2xl border border-white/10 bg-black/55 backdrop-blur p-2 shadow-lg shadow-black/40">
            <div className="text-[11px] text-white/60 px-2 pb-2">Reward this post</div>
            <div className="grid grid-cols-2 gap-2">
              {rewardItems.map((it) => (
                <button
                  key={it.mode}
                  type="button"
                  onClick={() => {
                    if (!activePostId) return;
                    setRewardOpen(false);
                    onOpenReward(it.mode, activePostId);
                  }}
                  className={[
                    "rounded-xl border border-white/10 bg-white/5",
                    "px-3 py-2 text-left",
                    "hover:bg-white/10 transition",
                    "active:scale-[0.99]",
                  ].join(" ")}
                >
                  <div className="text-base">{it.icon}</div>
                  <div className="text-xs text-white/90 font-semibold">{it.label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Reactions tray (long press on Like) */}
      {reactionOpen && canAct ? (
        <div
          className="fixed right-3 bottom-44 z-50 rounded-2xl border border-white/10 bg-black/60 backdrop-blur px-3 py-2 shadow-lg shadow-black/40"
          role="dialog"
          aria-label="Reactions"
        >
          <div className="flex items-center gap-2">
            {["🔥", "😂", "😮", "😢", "👏", "💎"].map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => chooseReaction(e)}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                aria-label={`React ${e}`}
              >
                <span className="text-lg">{e}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReactionOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
              aria-label="Close reactions"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
