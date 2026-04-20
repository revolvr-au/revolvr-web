"use client";

import { useState } from "react";

type Props = {
  username: string;
  caption: string;
  avatarUrl?: string;
  postId: string;
  latestComment?: { body: string; userEmail: string } | null;
};

export default function PostCaption({ username, caption, avatarUrl, postId, latestComment = null }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: "absolute",
      bottom: 100,
      left: 16,
      right: 80,
      zIndex: 20,
      pointerEvents: "auto",
    }}>
      <div style={{
        position: "absolute",
        inset: "-20px -16px -16px -16px",
        background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      <div
        style={{ position: "relative", zIndex: 1, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: avatarUrl
              ? `url(${avatarUrl}) center/cover`
              : "linear-gradient(135deg, #1a1a2e, #16213e)",
            border: "2px solid rgba(0,229,255,0.4)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            color: "white",
          }}>
            {!avatarUrl && (username?.[0]?.toUpperCase() ?? "?")}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
            {username}
          </span>
        </div>

        <p style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 2,
          WebkitBoxOrient: "vertical",
          overflow: expanded ? "visible" : "hidden",
        }}>
          {caption}
        </p>

        {latestComment && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
            <span style={{ fontSize: 11 }}>💬</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {latestComment.body.length > 40 ? latestComment.body.slice(0, 40) + "…" : latestComment.body}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>
              — @{latestComment.userEmail.split("@")[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
