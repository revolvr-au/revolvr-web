"use client";

import { useEffect, useState } from "react";

function voltageColor(v: number): string {
  if (v >= 100) return "#FF6B00";
  if (v >= 50) return "#FFB800";
  if (v >= 10) return "#00e5ff";
  return "rgba(255,255,255,0.15)";
}

function formatAge(createdAt: string | undefined): string {
  if (!createdAt) return "[ --:--:-- ]";
  const date = new Date(createdAt);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) {
    const secs = Math.floor((diff % 60_000) / 1000);
    return `[ 00:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} ]`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `[ ${String(hours).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}:00 ]`;
  return `[ ${Math.floor(hours / 24)}d ago ]`;
}

function CommentCard({
  comment,
  isReply = false,
  onReply,
  isActiveReply,
}: {
  comment: any;
  isReply?: boolean;
  onReply?: () => void;
  isActiveReply?: boolean;
}) {
  const voltage = comment.voltage || 0;
  const isHot = voltage >= 100;
  const stripColor = voltageColor(voltage);

  const displayName =
    typeof comment.display_name === "string" && comment.display_name.trim()
      ? comment.display_name
      : typeof comment.userEmail === "string" && comment.userEmail.includes("@")
      ? comment.userEmail.split("@")[0]
      : "user";

  const message = comment.message || comment.body || "";

  return (
    <div
      style={{
        display: "flex",
        borderRadius: isReply ? 10 : 12,
        overflow: "hidden",
        background: isReply
          ? "rgba(0,229,255,0.04)"
          : isActiveReply
          ? "rgba(0,229,255,0.05)"
          : "transparent",
        ...(isReply
          ? { border: "1px solid rgba(0,229,255,0.08)" }
          : { borderBottom: "1px solid rgba(255,255,255,0.06)" }),
        transition: "background 0.15s ease",
      }}
    >
      {/* Voltage left strip */}
      <div
        style={{
          width: 3,
          flexShrink: 0,
          background: isHot
            ? "linear-gradient(180deg, #FF6B00, transparent)"
            : voltage >= 50
            ? "linear-gradient(180deg, #FFB800, transparent)"
            : voltage >= 10
            ? "linear-gradient(180deg, #00e5ff, transparent)"
            : "linear-gradient(180deg, rgba(255,255,255,0.15), transparent)",
          animation: isHot ? "voltageHot 1.8s ease-in-out infinite" : undefined,
        }}
      />

      {/* Card content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          gap: isReply ? 8 : 10,
          alignItems: "flex-start",
          padding: isReply ? "10px 10px 10px 12px" : "12px 12px 12px 14px",
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: isReply ? 28 : 32,
            height: isReply ? 28 : 32,
            minWidth: isReply ? 28 : 32,
            borderRadius: "50%",
            overflow: "hidden",
            background: "rgba(255,255,255,0.1)",
            flexShrink: 0,
            position: "relative",
            boxShadow: "0 0 8px rgba(0,229,255,0.25)",
          }}
        >
          <img
            src={comment.avatar_url || "/default-avatar.png"}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: username + voltage */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </span>
          </div>

          {/* Row 2: comment text */}
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.9)",
              wordBreak: "break-word",
            }}
          >
            {message}
          </p>

          {/* Row 3: actions + timestamp */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 8,
            }}
          >
            {onReply && (
              <button
                onClick={onReply}
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "#00e5ff",
                  fontFamily: "inherit",
                }}
              >
                Reply
              </button>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>·</span>
            <span style={{
              fontSize: 10,
              color: "#00e5ff",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              letterSpacing: "0.05em",
              opacity: 0.7,
            }}>
              {formatAge(comment.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommentsList({
  postId,
  refreshKey,
  setReplyTo,
  replyTo,
}: {
  postId: string | null;
  refreshKey: number;
  setReplyTo: (data: { id: string; userEmail: string }) => void;
  replyTo: { id: string; userEmail: string } | null;
}) {
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (!postId) return;
    fetch(`/api/comments?postId=${postId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setComments(data.comments);
      });
  }, [postId, refreshKey]);

  const rootComments = comments
    .filter((c) => !c.parentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const repliesMap: Record<string, any[]> = {};
  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = [];
      repliesMap[c.parentId].push(c);
    }
  });

  if (rootComments.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 0",
        gap: 12,
      }}>
        <span style={{ fontSize: 32 }}>💬</span>
        <span style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.35)",
          textAlign: "center",
          lineHeight: 1.6,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          BE THE FIRST TO JOIN<br />THE CONVERSATION
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes voltageHot {
          0%   { background: linear-gradient(180deg, #FF6B00, #FFB800); }
          50%  { background: linear-gradient(180deg, #FFB800, #FF6B00); }
          100% { background: linear-gradient(180deg, #FF6B00, #FFB800); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
        {rootComments.map((c, index) => (
          <div key={`root-${c.id}`} className="animate-[fadeIn_0.25s_ease-out]" style={{ animationDelay: `${index * 40}ms` }}>
            <CommentCard
              comment={c}
              onReply={() => setReplyTo({ id: c.id, userEmail: c.userEmail })}
              isActiveReply={replyTo?.id === c.id}
            />

            {repliesMap[c.id]?.length ? (
              <div
                style={{
                  marginTop: 6,
                  marginLeft: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {repliesMap[c.id].map((r) => (
                  <div
                    key={`reply-${r.id}`}
                    style={{ display: "flex", alignItems: "flex-start", gap: 6 }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.25)",
                        marginTop: 12,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      ↳
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <CommentCard comment={r} isReply />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
