"use client";

import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Plus,
  Home
} from "lucide-react";

const [rewardBursts, setRewardBursts] = useState<number[]>([]);

type Props = {
  liked: boolean;
  onLike: () => void;
  onComment: () => void; 
  onShare: () => void; 
  onReward: () => void; 
  onCreate: () => void; 
  onHome: () => void;
  rewardCount: number; // ✅ ADD THIS
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
}: Props) {
  return (
    <div
      style={{
  position: "absolute",
  right: 12,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 20,
  zIndex: 300,
  color: "white"
}}
>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "1.5px solid white",
        }}
      />

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

      <MessageCircle
  size={26}
  strokeWidth={1.5}
  onClick={onComment}
  style={{ cursor: "pointer" }}
/>
      <Share2
      size={26}
      strokeWidth={1.5}
      onClick={onShare}
      style={{ cursor: "pointer" }}
      />
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
  <div
    key={id}
    style={{
      position: "absolute",
      bottom: 10,
      left: "50%",
      transform: "translateX(-50%)",
      color: "#FFD700",
      fontSize: 14,
      fontWeight: 700,
      animation: "rewardFloat 0.6s ease forwards",
      pointerEvents: "none",
    }}
  >
    +1
  </div>
))}

  {rewardCount > 0 && (
    <div
      style={{
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
      }}
    >
      {rewardCount}
    </div>
  )}
</div>
      <Plus
  size={30}
  strokeWidth={1.5}
  onClick={onCreate}
  style={{ cursor: "pointer" }}
/>
  <Home
  size={26}
  strokeWidth={1.5}
  onClick={onHome}
  style={{ marginTop: 4, cursor: "pointer" }}
/>
    </div>
  );
}