"use client";

import { useEffect, useState } from "react";

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

  const rootComments = comments.filter((c) => !c.parentId);
  const sortedComments = [...rootComments].sort((a, b) => {
    return (b.voltage || 0) - (a.voltage || 0);
  });

  const repliesMap: Record<string, any[]> = {};

  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) {
        repliesMap[c.parentId] = [];
      }
      repliesMap[c.parentId].push(c);
    }
  });

  const getDisplayName = (comment: any) => {
    if (typeof comment.display_name === "string" && comment.display_name.trim()) {
      return comment.display_name;
    }

    if (typeof comment.userEmail === "string" && comment.userEmail.includes("@")) {
      return comment.userEmail.split("@")[0];
    }

    return "user";
  };

  const getMessage = (comment: any) => comment.message || comment.body || "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 8 }}>
      {rootComments.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
          No comments yet
        </div>
      ) : (
        sortedComments.map((c, i) => {
          const isRecent = i >= sortedComments.length - 2;
          const isNew = i === sortedComments.length - 1;
          const voltage = c.voltage || 0;
          const voltageClass =
            voltage > 80
              ? "scale-[1.02]"
              : voltage > 50
              ? "scale-[1.01]"
              : "";
          const glowClass =
            voltage > 80
              ? "shadow-[0_0_12px_rgba(255,255,255,0.08)]"
              : "";
          const pulseClass =
            voltage > 80 ? "animate-[voltagePulse_1.6s_ease-out]" : "";
          const newCommentPulse =
            isNew ? "animate-[fadeIn_0.3s_ease-out]" : "";

          return (
            <div
              key={`root-${c.id}`}
              className="animate-[fadeIn_0.25s_ease-out]"
            >
              <div
                className={`rounded-xl px-1 py-1 transition-all duration-200 ${
                  replyTo?.id === c.id ? "bg-white/5" : "bg-transparent"
                }`}
              >
                <div
                  className={`${voltageClass} ${glowClass} ${pulseClass} ${newCommentPulse}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderRadius: 8,
                    padding: "4px 8px",
                    background: isRecent ? "rgba(255,255,255,0.05)" : "transparent",
                  }}
                >
                  <div style={{ width: 36, height: 36, minWidth: 36, maxWidth: 36, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", flexShrink: 0, position: "relative" }}>
                    <img
                      src={c.avatar_url || "/default-avatar.png"}
                      alt=""
                      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", display: "block" }}>
                      {getDisplayName(c)}
                    </span>
                    <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.8)", wordBreak: "break-word" }}>
                      {getMessage(c)}
                    </p>

                    <button
                      onClick={() => setReplyTo({ id: c.id, userEmail: c.userEmail })}
                      type="button"
                      style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      Reply
                    </button>

                    {repliesMap[c.id]?.length ? (
                      <div style={{ marginTop: 16, borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                        {repliesMap[c.id].map((r) => (
                          <div
                            key={`${r.id}-${c.id}`}
                            style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 8, padding: "4px 8px" }}
                          >
                            <div style={{ width: 30, height: 30, minWidth: 30, maxWidth: 30, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", flexShrink: 0, position: "relative" }}>
                              <img
                                src={r.avatar_url || "/default-avatar.png"}
                                alt=""
                                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.9)", display: "block" }}>
                                {getDisplayName(r)}
                              </span>
                              <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.8)", wordBreak: "break-word" }}>
                                {getMessage(r)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
