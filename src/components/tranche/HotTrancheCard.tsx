"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrancheFeedItem } from "./TrancheCard";
import TrancheReplyComposer, { type PostedReply } from "./TrancheReplyComposer";
import TrancheReplyList, { type ReplyItem } from "./TrancheReplyList";
import TrancheFactCheckSheet from "./TrancheFactCheckSheet";

const ROSE = "#B85C5C";
const ROSE_DIM = "rgba(184,92,92,0.32)";
const HOT_BG = "#1E1C19";
const HOT_BG_INNER = "#161412";
const HOT_INK = "#F5F2EC";
const HOT_INK_SOFT = "rgba(245,242,236,0.66)";
const HOT_INK_MUTE = "rgba(245,242,236,0.42)";

export type HotEvent = TrancheFeedItem & { voltsPerHour: number };

export default function HotTrancheCard({
  event,
  viewerEmail,
  onVolted,
}: {
  event: HotEvent;
  viewerEmail: string | null;
  onVolted?: (newVoltage: number) => void;
}) {
  const router = useRouter();
  const [voltage, setVoltage] = useState(event.stats.currentVoltage);
  const [volted, setVolted] = useState(false);
  const [volting, setVolting] = useState(false);
  const [witnesses, setWitnesses] = useState(event.stats.totalWitnesses);
  const [witnessed, setWitnessed] = useState(false);
  const [witnessing, setWitnessing] = useState(false);
  const [quietUntil, setQuietUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [replyOpen, setReplyOpen] = useState(false);
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [replyCount, setReplyCount] = useState(event.stats.totalReplies);
  const [factCheckOpen, setFactCheckOpen] = useState(false);
  const [tfcActive, setTfcActive] = useState(false);

  // Reset transient state when the underlying event changes (poll swap).
  useEffect(() => {
    setVoltage(event.stats.currentVoltage);
    setVolted(false);
    setWitnesses(event.stats.totalWitnesses);
    setWitnessed(false);
    setQuietUntil(null);
    setReplyOpen(false);
    setReplies([]);
    setReplyCount(event.stats.totalReplies);
    setFactCheckOpen(false);
  }, [event.id, event.stats.currentVoltage, event.stats.totalWitnesses, event.stats.totalReplies]);

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
    if (!quietUntil) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quietUntil]);

  const quietLeftMs = quietUntil ? Math.max(0, quietUntil - now) : 0;
  const inQuietPeriod = quietLeftMs > 0;

  const handleVolt = async () => {
    if (volted || volting || !viewerEmail) return;
    setVolting(true);
    setVoltage((v) => v + 1);
    try {
      const res = await fetch("/api/tranche/volt-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorEmail: viewerEmail, commentId: event.comment.id }),
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
          trancheEventId: event.id,
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
    const url = `${window.location.origin}/tranche?event=${event.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "TRANCHE",
          text: event.comment.body.slice(0, 120),
          url,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  };

  const handleSeedGath = () => {
    router.push(`/gath/create?seed=${event.id}`);
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

  const handle =
    event.author.handle ??
    event.post.creatorEmail.split("@")[0];
  const postCreatorHandle = event.post.creatorEmail.split("@")[0];

  return (
    <>
      <style>{`
        @keyframes hotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.92); }
        }
        @keyframes hotBorderGlow {
          0%, 100% { box-shadow: 0 0 0 1px ${ROSE_DIM}, 0 12px 32px rgba(184,92,92,0.18); }
          50% { box-shadow: 0 0 0 1px ${ROSE}, 0 14px 38px rgba(184,92,92,0.32); }
        }
        @keyframes hotFadeIn {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          background: HOT_BG,
          borderRadius: 12,
          overflow: "hidden",
          color: HOT_INK,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          marginBottom: 16,
          animation:
            "hotFadeIn 320ms ease-out, hotBorderGlow 2.4s ease-in-out infinite",
        }}
      >
        {/* PROVENANCE BAR — rose */}
        <div
          style={{
            background: ROSE,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
          }}
        >
          <span
            aria-hidden
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: HOT_INK,
              flexShrink: 0,
              animation: "hotPulse 1.4s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.26em",
              color: HOT_INK,
            }}
          >
            🔥 HOT
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(245,242,236,0.85)",
              letterSpacing: "0.06em",
            }}
          >
            from @{postCreatorHandle}&apos;s post
          </span>
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "'Space Grotesk', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: HOT_INK,
              fontWeight: 700,
            }}
          >
            +{event.voltsPerHour.toLocaleString()} V/HR
          </span>
        </div>

        {/* BODY */}
        <div style={{ padding: "18px 18px 14px" }}>
          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                overflow: "hidden",
                background: event.author.avatarUrl
                  ? `url(${event.author.avatarUrl}) center/cover`
                  : "rgba(245,242,236,0.1)",
                border: `1px solid rgba(245,242,236,0.18)`,
                flexShrink: 0,
              }}
              aria-hidden
            />
            <button
              onClick={() => event.author.handle && router.push(`/u/${event.author.handle}`)}
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                color: HOT_INK,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {event.author.displayName ?? `@${handle}`}
            </button>
            {event.author.handle && (
              <span style={{ fontSize: 11, color: HOT_INK_MUTE }}>@{event.author.handle}</span>
            )}
          </div>

          {/* Hero comment */}
          <div
            style={{
              background: HOT_BG_INNER,
              borderLeft: `3px solid ${ROSE}`,
              padding: "14px 16px",
              borderRadius: 6,
              fontSize: 18,
              lineHeight: 1.45,
              fontWeight: 500,
              color: HOT_INK,
              wordBreak: "break-word",
            }}
          >
            {event.comment.body}
          </div>

          {/* Velocity hero */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 26,
                color: ROSE,
                letterSpacing: "-0.01em",
              }}
            >
              {event.voltsPerHour.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: 12,
                color: HOT_INK_SOFT,
                letterSpacing: "0.06em",
              }}
            >
              VOLTs/hr · last 30 min
            </span>
          </div>

          {/* Action row */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <ActionButton
              onClick={() => setReplyOpen(true)}
              ariaLabel="Reply"
              count={replyCount}
              active={replyOpen}
            >
              <ReplyIcon />
            </ActionButton>

            <ActionButton
              onClick={handleVolt}
              disabled={!viewerEmail || volted || volting}
              ariaLabel="Volt"
              count={voltage}
              active={volted}
            >
              <BoltIcon color={volted ? ROSE : HOT_INK_SOFT} />
            </ActionButton>

            <ActionButton
              onClick={handleWitness}
              disabled={!viewerEmail || witnessed || witnessing || inQuietPeriod}
              ariaLabel={
                inQuietPeriod
                  ? `Quiet ${Math.ceil(quietLeftMs / 1000)}s`
                  : witnessed
                  ? "Witnessed"
                  : "Witness"
              }
              count={witnesses}
              active={witnessed}
            >
              <EyeIcon color={witnessed ? ROSE : HOT_INK_SOFT} />
            </ActionButton>

            <ActionButton onClick={handleShare} ariaLabel="Share">
              <ShareIcon />
            </ActionButton>

            {tfcActive && (
              <ActionButton
                onClick={() => setFactCheckOpen(true)}
                ariaLabel="File TFC fact check"
              >
                <TfcIcon />
              </ActionButton>
            )}

            <ActionButton onClick={handleSeedGath} ariaLabel="Seed GATH">
              <SparkIcon />
            </ActionButton>
          </div>

          {replies.length > 0 && (
            <TrancheReplyList replies={replies} theme="dark" />
          )}
        </div>
      </div>

      <TrancheReplyComposer
        postId={event.post.id}
        parentId={event.comment.id}
        viewerEmail={viewerEmail}
        theme="dark"
        open={replyOpen}
        onClose={() => setReplyOpen(false)}
        onPosted={handleReplyPosted}
      />

      {tfcActive && viewerEmail && (
        <TrancheFactCheckSheet
          open={factCheckOpen}
          onClose={() => setFactCheckOpen(false)}
          theme="dark"
          trancheEventId={event.id}
          commentId={event.comment.id}
          commentBody={event.comment.body}
          viewerEmail={viewerEmail}
        />
      )}
    </>
  );
}

function ActionButton({
  onClick,
  disabled,
  ariaLabel,
  count,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  count?: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: active ? "rgba(184,92,92,0.16)" : "transparent",
        border: `1px solid ${active ? ROSE_DIM : "rgba(245,242,236,0.1)"}`,
        borderRadius: 8,
        padding: "6px 10px",
        cursor: disabled ? "default" : "pointer",
        color: HOT_INK_SOFT,
        fontFamily: "'Space Grotesk', monospace",
        fontSize: 11,
        fontWeight: 700,
        opacity: disabled && !active ? 0.45 : 1,
        transition: "all 0.15s ease",
      }}
    >
      {children}
      {typeof count === "number" && count > 0 && (
        <span style={{ color: active ? ROSE : HOT_INK_SOFT }}>{count.toLocaleString()}</span>
      )}
    </button>
  );
}

function BoltIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M13 2L3 14h7l-1 8 11-14h-7l1-6z" />
    </svg>
  );
}

function ReplyIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function EyeIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShareIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function TfcIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function SparkIcon({ size = 14, color = HOT_INK_SOFT }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
    </svg>
  );
}
