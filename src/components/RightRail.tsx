"use client";

import {
  Heart,
  MessageCircle,
  Share2,
  Gift,
  Plus,
  Home
} from "lucide-react";

type Props = {
  liked: boolean;
  onLike: () => void;
  onComment: () => void; 
  onShare: () => void; 
  onReward: () => void; 
  onCreate: () => void; 
  onHome: () => void;
};

export default function RightRail({ liked, onLike, onComment, onShare, onReward, onCreate, onHome,  }: Props) {
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
      <Gift
      size={26}
      strokeWidth={1.5}
      onClick={onReward}
      style={{ cursor: "pointer" }}
      />
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