"use client";

// src/components/revolve/Chamber.tsx
//
// Phase 3 — one placeholder chamber. SKELETON ONLY (no live preview; those come later). The
// slot label is shown so the positional grammar + collapse are legible during review. Purely
// presentational: the overlay owns positioning, the fan-out transform, and the stagger delay,
// passing them in via `style`.
//
// Phase 4 — chambers are now selectable. The overlay supplies `onClick` (which stops
// propagation so the tap doesn't reach the backdrop-close) and toggles `highlighted` for the
// brief pre-close flash. Highlight is expressed via border/shadow ONLY so it never fights the
// transform the overlay drives through `style`.

import type { CSSProperties, MouseEvent } from "react";

export default function Chamber({
  label,
  style,
  onClick,
  highlighted = false,
}: {
  label: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  highlighted?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "20vw",
        maxWidth: 110,
        aspectRatio: "3 / 4",
        marginLeft: "-10vw",
        marginTop: "-13.3vw", // half of width * 4/3, keeps the box centred before transform
        borderRadius: 14,
        cursor: "pointer",
        background: highlighted
          ? "linear-gradient(145deg, rgba(255,255,255,0.24), rgba(255,255,255,0.12))"
          : "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
        border: highlighted
          ? "1px solid rgba(255,255,255,0.55)"
          : "1px solid rgba(255,255,255,0.14)",
        boxShadow: highlighted
          ? "0 0 0 3px rgba(255,255,255,0.45), 0 8px 28px rgba(0,0,0,0.45)"
          : "0 8px 28px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 10,
        willChange: "transform, opacity",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.78)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}
