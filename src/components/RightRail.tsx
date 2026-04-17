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
  onHome: () => void;
  rewardCount: number;
  avatarUrl?: string;
  username?: string;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
};

export default function RightRail({
  liked,
  onLike,
  onComment,
  onShare,
  onReward,
  onCreate,
  onHome,
  rewardCount,
  avatarUrl,
  username,
  isFollowing = false,
  onFollowToggle,
}: Props) {
  const [rewardBursts, setRewardBursts] = useState<number[]>([]);
  const [followed, setFollowed] = useState(isFollowing);
  const router = useRouter();

  useEffect(() => {
    setFollowed(isFollowing);
  }, [isFollowing]);

  const handleFollow = () => {
    const next = !followed;
    setFollowed(next);
    onFollowToggle?.();
  };

  const navigateToProfile = () => {
    if (username) {
      const handle = username.startsWith("@") ? username.slice(1) : username;
      if (handle) router.push(`/u/${handle}`);
    }
  };

  return (
    <div style={{
      position: "absolute",
      right: 12,
      bottom: 90,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20,
      zIndex: 300,
      color: "white",
    }}>

      {/* ── ARC AVATAR ── */}
      <div
        onClick={navigateToProfile}
        onTouchEnd={(e) => {
          e.preventDefault();
          navigateToProfile();
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          cursor: "pointer",
        }}
      >
        <div style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          background: avatarUrl
            ? `url(${avatarUrl}) center/cover`
            : "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: followed ? "2px solid #00e5ff" : "2px solid rgba(0,229,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
          color: "white",
          boxShadow: followed ? "0 0 12px rgba(0,229,255,0.5)" : "0 0 6px rgba(0,229,255,0.2)",
        }}>
          {!avatarUrl && (
            (username?.startsWith("@") ? username.slice(1) : username)?.[0]?.toUpperCase() ?? "?"
          )}
        </div>
        <span style={{
          fontSize: 7,
          letterSpacing: "1.5px",
          fontFamily: "monospace",
          textTransform: "uppercase",
          color: "#00e5ff",
          opacity: followed ? 0.7 : 0,
          transition: "opacity 0.4s ease",
        }}>
          following
        </span>
      </div>

      {/* ── LIKE ── */}
      <Heart
        size={26}
        strokeWidth={1.5}
        onClick={onLike}
        fill={liked ? "white" : "none"}
        style={{
          cursor: "pointer",
          transform: liked ? "scale(1.15)" : "scale(1)",
          transition: "all 0.2s ease",
        }}
      />

      {/* ── COMMENT ── */}
      <MessageCircle size={26} strokeWidth={1.5} onClick={onComment} style={{ cursor: "pointer" }} />

      {/* ── SHARE ── */}
      <Share2 size={26} strokeWidth={1.5} onClick={onShare} style={{ cursor: "pointer" }} />

      {/* ── REWARD ── */}
      <div style={{ position: "relative" }}>
        <Gift
          size={26}
          strokeWidth={1.5}
          onClick={() => {
            onReward();
            const id = Date.now();
            setRewardBursts(prev => [...prev, id]);
            setTimeout(() => {
              setRewardBursts(prev => prev.filter(b => b !== id));
            }, 600);
          }}
          style={{ cursor: "pointer" }}
        />
        {rewardBursts.map(id => (
          <div key={id} style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#FFD700",
            fontSize: 18,
            fontWeight: 800,
            animation: "rewardFloat 1s ease forwards",
            pointerEvents: "none",
          }}>+1</div>
        ))}
        {rewardCount > 0 && (
          <div style={{
            position: "absolute",
            bottom: -14,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 11,
            fontWeight: 600,
            color: "white",
            background: "rgba(0,0,0,0.6)",
            padding: "2px 6px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}>{rewardCount}</div>
        )}
      </div>

      {/* ── CREATE ── */}
      <Plus size={30} strokeWidth={1.5} onClick={onCreate} style={{ cursor: "pointer" }} />

      {/* ── PROFILE ── */}
<User size={26} strokeWidth={1.5} onClick={() => router.push("/me")} style={{ marginTop: 4, cursor: "pointer" }} />

      <style>{`
        @keyframes rewardFloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-30px); }
        }
      `}</style>
    </div>
  );
}