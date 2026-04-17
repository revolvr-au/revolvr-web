"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Gift, Plus, User } from "lucide-react";


type Props = {
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onReward: () => void;
  onCreate: () => void;
  rewardCount: number;
  avatarUrl?: string;
  username?: string;
  isFollowing?: boolean;
};

export default function RightRail({
  liked,
  onLike,
  onComment,
  onShare,
  onReward,
  onCreate,
  rewardCount,
  avatarUrl,
  username,
  isFollowing = false,
}: Props) {
  const [rewardBursts, setRewardBursts] = useState<number[]>([]);
  const [followed, setFollowed] = useState(isFollowing);
  const router = useRouter();
  const actionButtonClass =
  "flex h-12 w-12 items-center justify-center rounded-full bg-transparent border-0 outline-none text-white transition-all duration-150 active:scale-95";

  useEffect(() => {
    setFollowed(isFollowing);
  }, [isFollowing]);

  const navigateToProfile = () => {
    if (username) {
      const handle = username.startsWith("@") ? username.slice(1) : username;
      if (handle) router.push(`/u/${handle}`);
    }
  };

  const spacerLabel = <span className="text-[11px] font-semibold text-white/90">&nbsp;</span>;

  return (
    <div className="flex flex-col items-center gap-4" style={{ position: "absolute", right: "1rem", bottom: "9rem" }}>

      {/* ── ARC AVATAR ── */}
      <div
        onClick={navigateToProfile}
        onTouchEnd={(e) => {
          e.preventDefault();
          navigateToProfile();
        }}
        className="flex flex-col items-center gap-1.5 cursor-pointer"
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white transition-transform duration-150 active:scale-95"
          style={{
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover`
              : "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: followed ? "2px solid #00e5ff" : "2px solid rgba(0,229,255,0.4)",
            boxShadow: followed ? "0 0 12px rgba(0,229,255,0.5)" : "0 0 6px rgba(0,229,255,0.2)",
          }}
        >
          {!avatarUrl && (
            (username?.startsWith("@") ? username.slice(1) : username)?.[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <span
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#00e5ff] transition-opacity duration-200"
          style={{ opacity: followed ? 0.7 : 0 }}
        >
          following
        </span>
      </div>

      {/* ── LIKE ── */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          className={actionButtonClass}
          onClick={onLike}
          type="button"
        >
          <Heart
            size={26}
            strokeWidth={1.5}
            fill={liked ? "white" : "none"}
            style={{
              transform: liked ? "scale(1.15)" : "scale(1)",
              transition: "all 0.2s ease",
            }}
          />
        </button>
        {spacerLabel}
      </div>

      {/* ── COMMENT ── */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          className={actionButtonClass}
          onClick={onComment}
          type="button"
        >
          <MessageCircle size={26} strokeWidth={1.5} />
        </button>
        {spacerLabel}
      </div>

      {/* ── SHARE ── */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          className={actionButtonClass}
          onClick={onShare}
          type="button"
        >
          <Share2 size={26} strokeWidth={1.5} />
        </button>
        {spacerLabel}
      </div>

      {/* ── REWARD ── */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative">
          <button
            className={actionButtonClass}
            onClick={() => {
              onReward();
              const id = Date.now();
              setRewardBursts((prev) => [...prev, id]);
              setTimeout(() => {
                setRewardBursts((prev) => prev.filter((burstId) => burstId !== id));
              }, 600);
            }}
            type="button"
          >
            <Gift size={26} strokeWidth={1.5} />
          </button>
          {rewardBursts.map((id) => (
            <div
              key={id}
              style={{
                position: "absolute",
                bottom: 12,
                left: "50%",
                transform: "translateX(-50%)",
                color: "#FFD700",
                fontSize: 18,
                fontWeight: 800,
                animation: "rewardFloat 1s ease forwards",
                pointerEvents: "none",
              }}
            >
              +1
            </div>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-white/90">
          {rewardCount > 0 ? rewardCount : "\u00A0"}
        </span>
      </div>

      {/* ── CREATE ── */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          className={actionButtonClass}
          onClick={onCreate}
          type="button"
        >
          <Plus size={28} strokeWidth={1.5} />
        </button>
        {spacerLabel}
      </div>

      {/* ── PROFILE ── */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          className={actionButtonClass}
          onClick={() => router.push("/me")}
          type="button"
        >
          <User size={26} strokeWidth={1.5} />
        </button>
        {spacerLabel}
      </div>

      <style>{`
        @keyframes rewardFloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
