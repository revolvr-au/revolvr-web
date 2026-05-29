"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TrancheReplyComposer, { type PostedReply } from "./TrancheReplyComposer";
import TrancheReplyList, { type ReplyItem } from "./TrancheReplyList";
import TrancheFactCheckSheet from "./TrancheFactCheckSheet";
import WitnessPanel, { type WitnessProfile } from "./WitnessPanel";

const ROSE = "#B85C5C";
const SLATE = "#2C3E50";
const GREY_BAR = "#E0DDD6";
const PASCAL_HIGH = "#F5F2EC";
const PASCAL_MID = "#FFFFFF";
const PASCAL_LOW = "#FAF9F7";
const INK = "#0F1115";
const INK_SOFT = "#4A4F58";
const INK_MUTE = "#7A7F88";
const FIVE_MIN_MS = 5 * 60 * 1000;

type Author = {
  email: string;
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
  ringTier?: string;
};

type FeedStats = {
  breakoutVoltage: number;
  peakVoltage: number;
  currentVoltage: number;
  voltageSharePct: number;
  totalWitnesses: number;
  totalReplies: number;
  totalVoltsSinceBreakout: number;
};

export type TrancheFeedItem = {
  id: string;
  createdAt: string;
  comment: { id: string; body: string; createdAt: string };
  post: {
    id: string;
    captionSnippet: string;
    imageUrl: string | null;
    creatorEmail: string;
    voltage: number;
  };
  author: Author;
  stats: FeedStats;
  language: string;
  sponsored: boolean;
  gathId: string | null;
};

type TopContributor = {
  email: string;
  points: number;
  profile: { handle: string | null; displayName: string | null; avatarUrl: string | null } | null;
};

type StatsPayload = {
  ok: boolean;
  event?: {
    timeToThresholdMs: number;
    topContributors: TopContributor[];
    topWitnesses?: WitnessProfile[];
    counts: { witnesses: number; factChecks: number };
    sinBin: { active: boolean; level: number; expiresAt: string | null };
    post: { caption: string; userEmail: string; imageUrl: string | null } | null;
  };
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

function formatMs(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return s ? `${m}m ${s}s` : `${m}m`;
}

function BoltIcon({ size = 12, color = INK }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function ReplyIcon({ size = 16, color = INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function ShareIcon({ size = 16, color = INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function EyeIcon({ size = 16, color = INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TfcIcon({ size = 16, color = INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function pascalBg(voltage: number) {
  if (voltage >= 500) return PASCAL_HIGH;
  if (voltage >= 200) return PASCAL_MID;
  return PASCAL_LOW;
}

function AuthorChip({ author, onClick }: { author: Author; onClick: () => void }) {
  const initial = (author.displayName || author.handle || "?").charAt(0).toUpperCase();
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 4,
          background: author.avatarUrl
            ? `url(${author.avatarUrl}) center/cover`
            : "linear-gradient(135deg, #2a2f3a, #1a1f28)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {!author.avatarUrl && initial}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>
          {author.displayName ?? author.handle ?? "user"}
        </span>
        {author.handle && (
          <span style={{ fontSize: 11, color: INK_MUTE }}>@{author.handle}</span>
        )}
      </div>
    </button>
  );
}

export default function TrancheCard({
  item,
  viewerEmail,
  onVolted,
}: {
  item: TrancheFeedItem;
  viewerEmail: string | null;
  onVolted?: (newVoltage: number) => void;
}) {
  const router = useRouter();
  const [statsOpen, setStatsOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [factCheckOpen, setFactCheckOpen] = useState(false);
  const [tfcActive, setTfcActive] = useState(false);
  const [voltage, setVoltage] = useState(item.stats.currentVoltage);
  const [volted, setVolted] = useState(false);
  const [volting, setVolting] = useState(false);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [replyCount, setReplyCount] = useState(item.stats.totalReplies);
  const [witnesses, setWitnesses] = useState(item.stats.totalWitnesses);
  const [witnessed, setWitnessed] = useState(false);
  const [witnessing, setWitnessing] = useState(false);
  const [quietUntil, setQuietUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stats, setStats] = useState<StatsPayload["event"] | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [topWitnesses, setTopWitnesses] = useState<WitnessProfile[]>([]);

  const isFresh = useMemo(
    () => Date.now() - new Date(item.createdAt).getTime() < FIVE_MIN_MS,
    [item.createdAt],
  );
  const bg = pascalBg(item.stats.breakoutVoltage);
  const fontWeight = item.stats.breakoutVoltage >= 500 ? 500 : 400;
  const sharePct = Math.round(item.stats.voltageSharePct * 100);

  useEffect(() => {
    if (!viewerEmail) {
      setTfcActive(false);
      return;
    }
    let cancelled = false;
    fetch(`/api/tfc/status?email=${encodeURIComponent(viewerEmail)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTfcActive(d?.ok && d.status === "active");
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [viewerEmail]);

  useEffect(() => {
    if (!statsOpen || stats) return;
    setStatsLoading(true);
    fetch(`/api/tranche/event/${item.id}`)
      .then((r) => r.json() as Promise<StatsPayload>)
      .then((d) => {
        if (d?.ok && d.event) {
          setStats(d.event);
          if (d.event.topWitnesses) setTopWitnesses(d.event.topWitnesses);
        }
      })
      .catch(() => null)
      .finally(() => setStatsLoading(false));
  }, [statsOpen, stats, item.id]);

  useEffect(() => {
    if (witnesses <= 0) return;
    let cancelled = false;
    fetch(`/api/tranche/event/${item.id}`)
      .then((r) => r.json() as Promise<StatsPayload>)
      .then((d) => {
        if (!cancelled && d?.ok && d.event?.topWitnesses) {
          setTopWitnesses(d.event.topWitnesses);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [item.id, witnesses]);

  const handleVolt = async () => {
    if (volted || volting || !viewerEmail) return;
    setVolting(true);
    setVoltage((v) => v + 1);
    try {
      const res = await fetch("/api/tranche/volt-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorEmail: viewerEmail, commentId: item.comment.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        setVolted(true);
        if (typeof data.newVoltage === "number") {
          setVoltage(data.newVoltage);
          onVolted?.(data.newVoltage);
        }
      } else {
        setVoltage((v) => Math.max(0, v - 1));
      }
    } catch {
      setVoltage((v) => Math.max(0, v - 1));
    } finally {
      setVolting(false);
    }
  };

  useEffect(() => {
    if (!quietUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quietUntil]);

  const quietLeftMs = quietUntil ? Math.max(0, quietUntil - now) : 0;
  const inQuietPeriod = quietLeftMs > 0;

  const handleWitness = async () => {
    if (!viewerEmail || witnessed || witnessing || inQuietPeriod) return;
    setWitnessing(true);
    setWitnesses((w) => w + 1);
    try {
      const res = await fetch("/api/tranche/witness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          witnessEmail: viewerEmail,
          trancheEventId: item.id,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setWitnessed(true);
        if (typeof data.totalWitnesses === "number") {
          setWitnesses(data.totalWitnesses);
        }
      } else {
        setWitnesses((w) => Math.max(0, w - 1));
        if (data?.error === "quiet_period_active" && data.quietPeriodEndsAt) {
          setQuietUntil(new Date(data.quietPeriodEndsAt).getTime());
        }
      }
    } catch {
      setWitnesses((w) => Math.max(0, w - 1));
    } finally {
      setWitnessing(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/tranche?event=${item.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "TRANCHE",
          text: item.comment.body.slice(0, 120),
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleReplyPosted = (reply: PostedReply) => {
    setReplies((prev) => [
      ...prev,
      {
        id: reply.id,
        userEmail: reply.userEmail,
        body: reply.body,
        createdAt: reply.createdAt,
      },
    ]);
    setReplyCount((c) => c + 1);
  };

  const handleSeedGath = () => {
    router.push(`/gath/create?seed=${item.id}`);
  };

  const goToPost = () => router.push(`/feed?post=${item.post.id}`);

  const postCreatorLabel = useMemo(() => {
    const handle = item.post.creatorEmail.split("@")[0];
    return handle;
  }, [item.post.creatorEmail]);

  const widthPct = Math.min(100, Math.max(4, Math.round(item.stats.voltageSharePct * 100)));

  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 1px 0 rgba(0,0,0,0.04), 0 8px 24px rgba(15,17,21,0.08)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: INK,
      }}
    >
      {/* PROVENANCE BAR */}
      <div
        style={{
          background: GREY_BAR,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          color: INK_SOFT,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: ROSE,
            flexShrink: 0,
            animation: isFresh ? "trancheLivePulse 1.4s ease-in-out infinite" : "none",
          }}
        />
        <BoltIcon size={11} color={INK} />
        <span
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.16em",
            color: INK,
          }}
        >
          TRANCHE
        </span>
        <button
          onClick={goToPost}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 11,
            color: INK_SOFT,
            fontFamily: "inherit",
          }}
        >
          from @{postCreatorLabel}&apos;s post
        </button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: INK_MUTE }}>
          {relativeTime(item.createdAt)}
        </span>
        <button
          onClick={() => setStatsOpen((s) => !s)}
          style={{
            background: statsOpen ? INK : "transparent",
            color: statsOpen ? "#fff" : INK,
            border: `1px solid ${statsOpen ? INK : "rgba(15,17,21,0.25)"}`,
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.16em",
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            cursor: "pointer",
          }}
        >
          STATS
        </button>
      </div>

      {/* BODY */}
      <div style={{ padding: "14px 14px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <AuthorChip author={item.author} onClick={() => item.author.handle && router.push(`/u/${item.author.handle}`)} />
          <WitnessPanel
            author={item.author}
            witnessCount={witnesses}
            topWitnesses={topWitnesses}
            dominantSize={44}
            theme="light"
          />
        </div>

        {/* QUOTE */}
        <div
          style={{
            marginTop: 12,
            background: "#FFFFFF",
            borderLeft: `3px solid ${ROSE}`,
            padding: "12px 14px",
            borderRadius: 4,
            fontSize: 15,
            fontWeight,
            lineHeight: 1.55,
            color: INK,
            wordBreak: "break-word",
          }}
        >
          {item.comment.body}
        </div>

        {/* VOLTAGE BAR */}
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "rgba(15,17,21,0.06)",
              overflow: "hidden",
            }}
            aria-label={`voltage share ${sharePct}%`}
          >
            <div
              style={{
                width: `${widthPct}%`,
                height: "100%",
                background: SLATE,
                transition: "width 320ms ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: 6,
              fontSize: 11,
              color: INK_SOFT,
              letterSpacing: "0.06em",
            }}
          >
            <span style={{ textTransform: "lowercase" }}>voltage</span>
            <span
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontWeight: 700,
                fontSize: 14,
                color: INK,
              }}
            >
              {voltage.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <button
            onClick={() => setReplyOpen(true)}
            aria-label="Reply"
            style={iconButtonStyle(false)}
          >
            <ReplyIcon />
            {replyCount > 0 && <span style={iconCountStyle}>{replyCount}</span>}
          </button>

          <button
            onClick={handleVolt}
            disabled={!viewerEmail || volted || volting}
            aria-label="Volt"
            style={{
              ...iconButtonStyle(volted),
              opacity: !viewerEmail ? 0.45 : 1,
              cursor: !viewerEmail || volted ? "default" : "pointer",
            }}
          >
            <BoltIcon size={16} color={volted ? "#fff" : INK_SOFT} />
            <span style={iconCountStyle}>{voltage.toLocaleString()}</span>
          </button>

          <button
            onClick={handleWitness}
            disabled={!viewerEmail || witnessed || witnessing || inQuietPeriod}
            aria-label={
              inQuietPeriod
                ? `Witness available in ${Math.ceil(quietLeftMs / 1000)}s`
                : "Witness"
            }
            title={
              inQuietPeriod
                ? `Quiet period — ${Math.ceil(quietLeftMs / 1000)}s left`
                : witnessed
                  ? "You witnessed this"
                  : "Witness this breakout"
            }
            style={{
              ...iconButtonStyle(witnessed),
              opacity: !viewerEmail || inQuietPeriod ? 0.45 : 1,
              cursor: !viewerEmail || witnessed || inQuietPeriod ? "default" : "pointer",
            }}
          >
            <EyeIcon size={16} color={witnessed ? "#fff" : INK_SOFT} />
            <span style={iconCountStyle}>
              {inQuietPeriod ? `${Math.ceil(quietLeftMs / 1000)}s` : witnesses.toLocaleString()}
            </span>
          </button>

          <button onClick={handleShare} aria-label="Share" style={iconButtonStyle(false)}>
            <ShareIcon />
          </button>

          {tfcActive && (
            <button
              onClick={() => setFactCheckOpen(true)}
              aria-label="File TFC fact check"
              title="File TFC fact check"
              style={iconButtonStyle(false)}
            >
              <TfcIcon />
              <span style={iconCountStyle}>TFC</span>
            </button>
          )}

          <button
            onClick={handleSeedGath}
            style={{
              marginLeft: "auto",
              background: INK,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 14px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            SEED GATH
          </button>
        </div>

        {replies.length > 0 && (
          <TrancheReplyList replies={replies} theme="light" />
        )}
      </div>

      {/* STATS PANEL */}
      <div
        style={{
          maxHeight: statsOpen ? 600 : 0,
          overflow: "hidden",
          transition: "max-height 320ms ease",
          background: "rgba(15,17,21,0.03)",
          borderTop: statsOpen ? "1px solid rgba(15,17,21,0.06)" : "none",
        }}
      >
        <div style={{ padding: "14px 14px 16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <StatTile label="BREAKOUT" value={item.stats.breakoutVoltage.toLocaleString()} />
            <StatTile label="WITNESSES" value={witnesses.toLocaleString()} />
            <StatTile
              label="TIME TO 🚀"
              value={stats ? formatMs(stats.timeToThresholdMs) : statsLoading ? "…" : "–"}
            />
            <StatTile label="REPLIES" value={replyCount.toLocaleString()} />
          </div>

          <div style={{ fontSize: 9, letterSpacing: "0.18em", color: INK_MUTE, marginBottom: 6 }}>
            TOP CONTRIBUTORS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {statsLoading && !stats ? (
              <div style={{ fontSize: 11, color: INK_MUTE }}>Loading…</div>
            ) : stats?.topContributors?.length ? (
              stats.topContributors.map((c) => (
                <div
                  key={c.email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: INK,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: c.profile?.avatarUrl
                        ? `url(${c.profile.avatarUrl}) center/cover`
                        : "linear-gradient(135deg, #2a2f3a, #1a1f28)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {!c.profile?.avatarUrl &&
                      (c.profile?.handle?.[0]?.toUpperCase() ??
                        c.email[0]?.toUpperCase() ??
                        "?")}
                  </div>
                  <span style={{ flex: 1 }}>
                    @{c.profile?.handle ?? c.email.split("@")[0]}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', monospace",
                      fontSize: 11,
                      color: INK_SOFT,
                    }}
                  >
                    {c.points} ⚡
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11, color: INK_MUTE }}>No contributors yet</div>
            )}
          </div>

          <div style={{ fontSize: 9, letterSpacing: "0.18em", color: INK_MUTE, marginBottom: 6 }}>
            ORIGIN POST
          </div>
          <button
            onClick={goToPost}
            style={{
              width: "100%",
              textAlign: "left",
              background: "#fff",
              border: "1px solid rgba(15,17,21,0.08)",
              borderRadius: 6,
              padding: "10px 12px",
              cursor: "pointer",
              color: INK,
              fontFamily: "inherit",
            }}
          >
            <div style={{ fontSize: 10, color: INK_MUTE, marginBottom: 4 }}>
              @{postCreatorLabel}
            </div>
            <div
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: INK,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.post.captionSnippet || "(no caption)"}
            </div>
          </button>

          {stats?.sinBin?.active && (
            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                color: "#7A4F1E",
                background: "#FFF4E0",
                border: "1px solid #F0D9A8",
                padding: "6px 10px",
                borderRadius: 6,
                letterSpacing: "0.08em",
              }}
            >
              SIN BIN L{stats.sinBin.level} · ends{" "}
              {stats.sinBin.expiresAt
                ? new Date(stats.sinBin.expiresAt).toLocaleTimeString()
                : "—"}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes trancheLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }
      `}</style>

      <TrancheReplyComposer
        postId={item.post.id}
        parentId={item.comment.id}
        viewerEmail={viewerEmail}
        theme="light"
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        onPosted={handleReplyPosted}
      />

      {tfcActive && viewerEmail && (
        <TrancheFactCheckSheet
          open={factCheckOpen}
          onClose={() => setFactCheckOpen(false)}
          theme="light"
          trancheEventId={item.id}
          commentId={item.comment.id}
          commentBody={item.comment.body}
          viewerEmail={viewerEmail}
        />
      )}
    </div>
  );
}

const iconButtonStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: active ? INK : "transparent",
  color: active ? "#fff" : INK_SOFT,
  border: `1px solid ${active ? INK : "rgba(15,17,21,0.08)"}`,
  borderRadius: 999,
  padding: "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 11,
});

const iconCountStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', monospace",
  fontSize: 11,
  fontWeight: 600,
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(15,17,21,0.06)",
        borderRadius: 6,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.18em", color: INK_MUTE, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', monospace",
          fontSize: 18,
          fontWeight: 700,
          color: INK,
        }}
      >
        {value}
      </div>
    </div>
  );
}
