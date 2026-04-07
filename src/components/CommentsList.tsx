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

  const repliesMap: Record<string, any[]> = {};

  comments.forEach((c) => {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) {
        repliesMap[c.parentId] = [];
      }
      repliesMap[c.parentId].push(c);
    }
  });

  return (
    <div style={{ paddingBottom: 80 }}>
      {rootComments.map((c) => (
        <div
          key={`root-${c.id}`}
          style={{
            marginBottom: 16,
            background:
              replyTo?.id === c.id
                ? "rgba(255,255,255,0.04)"
                : "transparent",
            padding: "6px 6px",
            borderRadius: 8,
            transition: "all 0.2s ease",
          }}
        >
          {/* USER */}
          <div
            style={{
              fontSize: 12,
              opacity: 0.5,
              marginBottom: 2,
              fontWeight: 500,
            }}
          >
            {c.userEmail}
          </div>

          {/* COMMENT */}
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.45,
              marginBottom: 6,
            }}
          >
            {c.body}
          </div>

          {/* ACTIONS */}
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 12,
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            <span
              onClick={() =>
                setReplyTo({
                  id: c.id,
                  userEmail: c.userEmail,
                })
              }
              style={{ cursor: "pointer" }}
            >
              Reply
            </span>

            <span style={{ cursor: "pointer" }}>
              Tranche
            </span>
          </div>

          {/* REPLIES */}
          {repliesMap[c.id]?.map((r) => (
            <div
              key={`${r.id}-${c.id}`}
              style={{
                marginTop: 10,
                marginLeft: 18,
                paddingLeft: 12,
                borderLeft: "2px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.5 }}>
                {r.userEmail}
              </div>

              <div style={{ fontSize: 14 }}>
                {r.body}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}