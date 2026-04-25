"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, SendHorizontal } from "lucide-react";
import CommentsList from "@/components/CommentsList";

const REACTIONS = ["🔥", "⚡", "👀", "💎", "🎯"];

export default function CommentsPanel({
  postId,
  onClose,
  userEmail,
}: {
  postId: string;
  onClose: () => void;
  userEmail: string | null;
}) {
  const [visible, setVisible] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; userEmail: string } | null>(null);
  const [tappedReaction, setTappedReaction] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const isDragging = dragOffset > 0;

  // Mount animation — one frame delay so transition fires
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 220);
  }, [onClose]);

  const sendComment = useCallback(
    async (body: string) => {
      if (!body.trim() || !userEmail || !postId) return;
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          userEmail,
          body,
          parentId: replyTo?.id ?? null,
        }),
      });
      setCommentText("");
      setReplyTo(null);
      setRefreshKey((k) => k + 1);
    },
    [userEmail, postId, replyTo],
  );

  const handleReaction = useCallback(
    async (emoji: string) => {
      setTappedReaction(emoji);
      setTimeout(() => setTappedReaction(null), 320);
      await sendComment(emoji);
    },
    [sendComment],
  );

  // Drag handle gesture
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    handleRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (dragOffset > 120) {
      dismiss();
    } else {
      setDragOffset(0);
    }
    dragStartY.current = null;
  }, [dragOffset, dismiss]);

  const panelOpacity = isDragging ? Math.max(0, 1 - dragOffset / 280) : visible ? 1 : 0;
  const panelTransform = isDragging
    ? `scale(1) translateY(${dragOffset}px)`
    : visible
    ? "scale(1) translateY(0)"
    : "scale(0.95) translateY(0)";

  return (
    <div
      onClick={dismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "92%",
          maxWidth: 480,
          height: "75dvh",
          display: "flex",
          flexDirection: "column",
          background: "rgba(5, 8, 20, 0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
          transition: isDragging ? "none" : "transform 0.22s ease, opacity 0.22s ease",
          transform: panelTransform,
          opacity: panelOpacity,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          willChange: "transform, opacity",
        }}
      >
        {/* Drag handle */}
        <div
          ref={handleRef}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingTop: 12,
            paddingBottom: 8,
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.2)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: "white" }}>Comments</span>
          <button
            onClick={dismiss}
            type="button"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "none",
              color: "rgba(255,255,255,0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable comment list */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "12px 16px",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
          className="no-scrollbar"
        >
          <CommentsList
            postId={postId}
            refreshKey={refreshKey}
            setReplyTo={setReplyTo}
            replyTo={replyTo}
          />
        </div>

        {/* Reaction bar */}
        <div
          style={{
            flexShrink: 0,
            padding: "8px 16px",
            display: "flex",
            gap: 8,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
          className="no-scrollbar"
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              type="button"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
                transition: "transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: tappedReaction === emoji ? "scale(1.3)" : "scale(1)",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div
          style={{
            flexShrink: 0,
            padding: "8px 16px",
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {replyTo && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                marginBottom: 6,
                paddingLeft: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Replying to @{replyTo.userEmail}</span>
              <button
                onClick={() => setReplyTo(null)}
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 11,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment(commentText)}
              placeholder={replyTo ? `Reply to @${replyTo.userEmail}...` : "Add to the conversation..."}
              style={{
                flex: 1,
                borderRadius: 20,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "10px 14px",
                height: 40,
                fontSize: 14,
                color: "white",
                outline: "none",
                minWidth: 0,
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => sendComment(commentText)}
              type="button"
              style={{
                width: 40,
                height: 40,
                minWidth: 40,
                borderRadius: "50%",
                background: "#00e5ff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <SendHorizontal size={18} color="#050814" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
