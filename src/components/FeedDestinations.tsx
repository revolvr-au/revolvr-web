"use client";

import { Users } from "lucide-react";

// Micro-label treatment lifted verbatim from the ActionCylinder's active-key label
// so the two affordance clusters read as one system.
const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 8,
  letterSpacing: "0.22em",
  color: "rgba(255,255,255,0.6)",
  textTransform: "uppercase",
  lineHeight: 1,
};

// 44px minimum on both axes — the visible mark stays small, the hit-zone doesn't.
const ENTRY_STYLE: React.CSSProperties = {
  minWidth: 44,
  minHeight: 44,
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
};

const LIVE_RED = "#ff3b30";

/**
 * Destinations column: top-right of the feed, mirroring TopBar's vertical TRANCHE
 * wordmark on the left wall. LIVE on top (creator-gated), GATH beneath.
 *
 * `anyLive` is FEED-SCOPED — it reflects live posts in the loaded feed payload, not
 * global platform presence. An empty first page reads as "nothing live" even if a
 * stream is running further down the ranking.
 */
export default function FeedDestinations({
  canGoLive,
  anyLive,
  onGoLive,
  onOpenGath,
}: {
  canGoLive: boolean;
  anyLive: boolean;
  onGoLive: () => void;
  onOpenGath: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(env(safe-area-inset-top, 0px) + 44px)",
        right: 0,
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        // Hug the wall; the extra hit-zone width falls inward, away from the edge.
        padding: "0 6px 0 0",
      }}
    >
      {canGoLive && (
        <button
          onClick={onGoLive}
          aria-label={anyLive ? "Go live — streams are live in this feed" : "Go live"}
          style={ENTRY_STYLE}
        >
          <span
            className={anyLive ? "feed-live-dot feed-live-dot--hot" : "feed-live-dot"}
            style={{ background: anyLive ? LIVE_RED : "#ffffff" }}
            aria-hidden
          />
          <span style={LABEL_STYLE}>LIVE</span>
        </button>
      )}

      <button onClick={onOpenGath} aria-label="Open GATH" style={ENTRY_STYLE}>
        <Users size={20} color="#ffffff" />
        <span style={LABEL_STYLE}>GATH</span>
      </button>

      <style>{`
        .feed-live-dot {
          display: block;
          width: 13px;
          height: 13px;
          border-radius: 50%;
        }
        /* Breath, not strobe: one slow inhale/exhale, no hard edges. */
        .feed-live-dot--hot {
          animation: feedLiveBreath 3.6s ease-in-out infinite;
        }
        @keyframes feedLiveBreath {
          0%, 100% {
            transform: scale(1);
            opacity: 0.68;
            box-shadow: 0 0 4px ${LIVE_RED};
          }
          50% {
            transform: scale(1.18);
            opacity: 1;
            box-shadow: 0 0 12px ${LIVE_RED};
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .feed-live-dot--hot {
            animation: none !important;
            transform: none;
            opacity: 1;
            box-shadow: 0 0 6px ${LIVE_RED};
          }
        }
      `}</style>
    </div>
  );
}
