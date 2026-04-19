"use client";

import { useState, useEffect } from "react";

type Props = {
  username: string;
  caption: string;
  avatarUrl?: string;
  postId: string;
  voltage: number;
};

export default function PostCaption({ username, caption, avatarUrl, postId, voltage }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [latestComment, setLatestComment] = useState<{ body: string; userEmail: string } | null>(null);

  useEffect(() => {
    if (!postId) return;
    fetch(`/api/comments?postId=${postId}&limit=1`)
      .then(r => r.json())
      .then(data => {
        const first = Array.isArray(data.comments) ? data.comments[data.comments.length - 1] : null;
        setLatestComment(first ?? null);
      })
      .catch(() => {});
  }, [postId]);

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

        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
          <span style={{ fontSize: 11 }}>⚡</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#00e5ff" }}>{voltage}</span>
          <span style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: "1.5px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>voltage</span>
        </div>
      </div>
    </div>
  );
}
