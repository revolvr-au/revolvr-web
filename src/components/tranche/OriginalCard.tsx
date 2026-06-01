"use client";

import { useEffect, useRef, useState } from "react";

// ── Identity colours (ORIGINAL = slate) ──────────────────────────────────────
const SLATE = "#2C3E50";
const CARD_BG = "#FFFFFF";
const HAIRLINE = "rgba(15,17,21,0.08)";
const DIVIDER = "rgba(15,17,21,0.05)";
const STATEMENT_INK = "#1E1C19";
const MUTE = "rgba(15,17,21,0.35)";
const MUTE_SOFT = "rgba(15,17,21,0.5)";
const LIVE_RED = "#C92B2B";
const AMBER_VOLT = "#C07800";
const GOLD_DOT = "#E8A000";
const DOT_EMPTY = "rgba(15,17,21,0.1)";

// Voltage at which the leading comment breaks out into its own TRANCHE moment.
const BREAKOUT_THRESHOLD = 200;
const DOT_COUNT = 5;
const ROTATE_MS = 6000;
const LIVE_POLL_MS = 30_000;

export type OriginalReply = {
  id: string;
  body: string;
  voltage: number;
  userEmail: string;
  handle: string | null;
  createdAt: string;
};

export type OriginalItem = {
  id: string;
  body: string;
  originalVariants: string[];
  userEmail: string;
  createdAt: string;
  voltage: number;
  replyCount: number;
  author: {
    displayName: string | null;
    handle: string | null;
    avatarUrl: string | null;
  };
  replies: OriginalReply[];
};

type Props = {
  item: OriginalItem;
  viewerEmail: string | null;
  onVolted?: (postId: string, newVoltage: number) => void;
  onComment?: (item: OriginalItem) => void;
  onSeedGath?: (item: OriginalItem) => void;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function handleText(handle: string | null, email: string) {
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  return `@${email.split("@")[0]}`;
}

export default function OriginalCard({
  item,
  viewerEmail,
  onVolted,
  onComment,
  onSeedGath,
}: Props) {
  const variants =
    item.originalVariants && item.originalVariants.length > 0
      ? item.originalVariants
      : [item.body];

  // ── Statement rotation (crossfade) ─────────────────────────────────────────
  const [variantIndex, setVariantIndex] = useState(0);
  useEffect(() => {
    if (variants.length <= 1) return;
    const id = window.setInterval(() => {
      setVariantIndex((i) => (i + 1) % variants.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [variants.length]);

  // Tallest variant sizes the box so the crossfade doesn't shift layout.
  const longestVariant = variants.reduce(
    (a, b) => (b.length > a.length ? b : a),
    variants[0] ?? "",
  );

  // ── Live viewer count poll ──────────────────────────────────────────────────
  const [liveCount, setLiveCount] = useState(0);
  const viewerIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!viewerIdRef.current) {
      viewerIdRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Math.floor(performance.now())}`;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/tranche/originals/live-count/${item.id}?viewerId=${viewerIdRef.current}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.ok) setLiveCount(data.count ?? 0);
      } catch {
        /* swallow — keep last known count */
      }
    };
    poll();
    const id = window.setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [item.id]);

  // ── Voltage (optimistic) ────────────────────────────────────────────────────
  const [voltage, setVoltage] = useState(item.voltage);
  useEffect(() => setVoltage(item.voltage), [item.voltage]);

  const handleVolt = () => {
    const next = voltage + 1;
    setVoltage(next);
    onVolted?.(item.id, next);
  };

  // Dots track the leading comment's journey to breakout (replies sorted desc).
  const peakReplyVoltage = item.replies.length > 0 ? item.replies[0].voltage : 0;
  const filledDots = Math.max(
    0,
    Math.min(DOT_COUNT, Math.round((peakReplyVoltage / BREAKOUT_THRESHOLD) * DOT_COUNT)),
  );

  const initials = (item.author.displayName ?? item.userEmail)
    .slice(0, 1)
    .toUpperCase();

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${HAIRLINE}`,
        borderLeft: `4px solid ${SLATE}`,
        borderRadius: 12,
        padding: "12px 14px",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: MUTE,
          }}
        >
          ORIGINAL
        </span>
        <span style={{ fontSize: 10, color: MUTE }}>
          {relativeTime(item.createdAt)}
        </span>
      </div>

      {/* AUTHOR ROW */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          {item.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.author.avatarUrl}
              alt=""
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                flexShrink: 0,
                background: SLATE,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {initials}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: STATEMENT_INK,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.author.displayName ?? item.userEmail.split("@")[0]}
            </div>
            <div style={{ fontSize: 10, color: MUTE }}>
              {handleText(item.author.handle, item.userEmail)}
            </div>
          </div>
        </div>

        {/* LIVE PILL */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: LIVE_RED,
            borderRadius: 999,
            padding: "3px 8px",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: 999,
              background: "#fff",
              animation: "originalLivePulse 1.4s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#fff",
            }}
          >
            LIVE
          </span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.75)" }}>
            {liveCount}
          </span>
        </div>
      </div>

      {/* STATEMENT (rotating crossfade) */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        {/* invisible sizer */}
        <div
          aria-hidden
          style={{
            fontSize: 15,
            fontWeight: 400,
            lineHeight: 1.58,
            color: "transparent",
            visibility: "hidden",
          }}
        >
          {longestVariant}
        </div>
        {variants.map((v, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.58,
              color: STATEMENT_INK,
              opacity: i === variantIndex ? 1 : 0,
              transition: "opacity 0.7s ease-in-out",
              pointerEvents: "none",
            }}
          >
            {v}
          </div>
        ))}
      </div>

      {/* REPLY PREVIEW */}
      {item.replies.length > 0 && (
        <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {item.replies.map((r) => (
            <div
              key={r.id}
              style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  color: AMBER_VOLT,
                  flexShrink: 0,
                }}
              >
                {r.voltage}V
              </span>
              <span style={{ fontSize: 11, color: MUTE, flexShrink: 0 }}>
                {handleText(r.handle, r.userEmail)}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: MUTE_SOFT,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
              >
                {r.body}
              </span>
            </div>
          ))}
          {item.replyCount > 0 && (
            <button
              type="button"
              onClick={() => onComment?.(item)}
              style={{
                alignSelf: "flex-start",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 11,
                color: SLATE,
                opacity: 0.7,
              }}
            >
              View all {item.replyCount} {item.replyCount === 1 ? "reply" : "replies"} →
            </button>
          )}
        </div>
      )}

      {/* DIVIDER */}
      <div style={{ height: 1, background: DIVIDER, margin: "0 -14px 10px" }} />

      {/* BOTTOM ROW */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Voltage dots + number */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: i < filledDots ? GOLD_DOT : DOT_EMPTY,
                }}
              />
            ))}
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 9,
              color: MUTE,
            }}
          >
            {voltage}
          </span>
        </div>

        {/* separator */}
        <span style={{ width: 1, height: 16, background: HAIRLINE }} />

        {/* VOLT */}
        <button
          type="button"
          onClick={handleVolt}
          disabled={!viewerEmail}
          aria-label="Volt"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(232,160,0,0.12)",
            border: "none",
            borderRadius: 8,
            padding: "6px 9px",
            cursor: viewerEmail ? "pointer" : "default",
            opacity: viewerEmail ? 1 : 0.5,
          }}
        >
          <BoltIcon color={AMBER_VOLT} />
        </button>

        {/* Comment */}
        <button
          type="button"
          onClick={() => onComment?.(item)}
          aria-label="Replies"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "transparent",
            border: "none",
            padding: "6px 4px",
            cursor: "pointer",
            color: MUTE_SOFT,
          }}
        >
          <CommentIcon color={MUTE_SOFT} />
          <span
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {item.replyCount}
          </span>
        </button>

        {/* Witness / Eye */}
        <button
          type="button"
          aria-label="Witness"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "transparent",
            border: "none",
            padding: "6px 4px",
            cursor: "pointer",
            color: MUTE_SOFT,
          }}
        >
          <EyeIcon color={MUTE_SOFT} />
        </button>

        {/* SEED GATH */}
        <button
          type="button"
          onClick={() => onSeedGath?.(item)}
          style={{
            marginLeft: "auto",
            background: "#0F1115",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "7px 11px",
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            cursor: "pointer",
          }}
        >
          SEED GATH
        </button>
      </div>

      <style>{`
        @keyframes originalLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

function BoltIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill={color} stroke="none" aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function CommentIcon({ color }: { color: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function EyeIcon({ color }: { color: string }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
