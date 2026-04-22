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
    <div className="space-y-4 pb-20">
      {rootComments.length === 0 ? (
        <div className="flex h-full min-h-40 items-center justify-center text-sm text-white/40">
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
                  className={`flex items-start gap-3 rounded-lg px-2 py-1 transition-all duration-150 hover:bg-white/5 ${voltageClass} ${glowClass} ${pulseClass} ${newCommentPulse} ${
                    isRecent ? "bg-white/5" : ""
                  }`}
                >
              <div style={{ width: 36, height: 36, minWidth: 36, maxWidth: 36, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", flexShrink: 0, position: "relative" }}>
                <img
                  src={c.avatar_url || "/default-avatar.png"}
                  alt=""
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

                  <div className="flex-1">
                <span className="text-[13px] font-semibold text-white/90">
                  {getDisplayName(c)}
                </span>
                <p className="mt-0.5 text-[13px] leading-relaxed text-white/80">
                  {getMessage(c)}
                </p>

                <button
                  onClick={() =>
                    setReplyTo({
                      id: c.id,
                      userEmail: c.userEmail,
                    })
                  }
                  type="button"
                  className="mt-2 text-xs font-medium text-white/50"
                >
                  Reply
                </button>

                    {repliesMap[c.id]?.length ? (
                  <div className="mt-4 space-y-4 border-l border-white/10 pl-4">
                    {repliesMap[c.id].map((r) => (
                      <div
                        key={`${r.id}-${c.id}`}
                        className="flex items-start gap-3 rounded-lg px-2 py-1 transition-colors duration-150 hover:bg-white/5"
                      >
                        <div style={{ width: 30, height: 30, minWidth: 30, maxWidth: 30, borderRadius: "50%", overflow: "hidden", background: "rgba(255,255,255,0.1)", flexShrink: 0, position: "relative" }}>
                          <img
                            src={r.avatar_url || "/default-avatar.png"}
                            alt=""
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>

                        <div className="flex-1">
                          <span className="text-[13px] font-semibold text-white/90">
                            {getDisplayName(r)}
                          </span>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-white/80">
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
