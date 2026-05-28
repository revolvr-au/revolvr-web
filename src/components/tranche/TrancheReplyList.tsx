"use client";

import { useMemo } from "react";

type Theme = "light" | "dark";

export type ReplyItem = {
  id: string;
  userEmail: string;
  body: string;
  createdAt: string;
};

const MEDIA_RE = /\[(GIF|IMG|VIDEO)\]\s+(\S+)/i;

function parseBody(raw: string): { text: string; media: { kind: "gif" | "image" | "video"; url: string } | null } {
  const m = raw.match(MEDIA_RE);
  if (!m) return { text: raw, media: null };
  const tag = m[1].toUpperCase();
  const url = m[2];
  const text = raw.replace(MEDIA_RE, "").trim();
  const kind = tag === "GIF" ? "gif" : tag === "IMG" ? "image" : "video";
  return { text, media: { kind, url } };
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function TrancheReplyList({
  replies,
  theme,
}: {
  replies: ReplyItem[];
  theme: Theme;
}) {
  const dark = theme === "dark";
  const ink = dark ? "#F5F2EC" : "#0F1115";
  const inkSoft = dark ? "rgba(245,242,236,0.66)" : "#4A4F58";
  const inkMute = dark ? "rgba(245,242,236,0.42)" : "#7A7F88";
  const lineBg = dark ? "rgba(245,242,236,0.05)" : "rgba(15,17,21,0.04)";

  const parsed = useMemo(
    () =>
      replies.map((r) => ({
        ...r,
        parsed: parseBody(r.body),
      })),
    [replies],
  );

  if (parsed.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: ink,
      }}
    >
      {parsed.map((r) => (
        <div
          key={r.id}
          style={{
            background: lineBg,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>
              @{r.userEmail.split("@")[0]}
            </span>
            <span style={{ fontSize: 10, color: inkMute }}>
              {relativeTime(r.createdAt)}
            </span>
          </div>
          {r.parsed.text && (
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                color: ink,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {r.parsed.text}
            </div>
          )}
          {r.parsed.media && (
            <div
              style={{
                marginTop: r.parsed.text ? 6 : 0,
                borderRadius: 6,
                overflow: "hidden",
                background: dark ? "rgba(0,0,0,0.2)" : "rgba(15,17,21,0.05)",
                maxWidth: 360,
              }}
            >
              {r.parsed.media.kind === "video" ? (
                <video
                  src={r.parsed.media.url}
                  controls
                  playsInline
                  style={{ width: "100%", maxHeight: 240, display: "block" }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.parsed.media.url}
                  alt={r.parsed.media.kind}
                  style={{
                    width: "100%",
                    maxHeight: 240,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 10, color: inkSoft, letterSpacing: "0.1em" }}>
        {parsed.length === 1 ? "1 reply" : `${parsed.length} replies`}
      </div>
    </div>
  );
}
