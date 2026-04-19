"use client";

import { useState } from "react";

type Props = {
  username: string;
  caption: string;
};

export default function PostCaption({ username, caption }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      position: "absolute",
      bottom: 80,
      left: 16,
      right: 80,
      zIndex: 20,
      pointerEvents: "auto",
    }}>
      {/* Gradient for readability */}
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
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: "white",
          marginBottom: 4,
          fontFamily: "monospace",
          letterSpacing: 1,
        }}>
          @{username}
        </p>
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
      </div>
    </div>
  );
}