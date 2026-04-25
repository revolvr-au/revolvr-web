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

  // iOS keyboard: reposition + resize panel via direct DOM so React state
  // doesn't cause a delayed re-render that lets the panel jump first.
  useEffect(() => {
    const panel = document.getElementById("comments-panel");
    if (!panel) return;

    const handler = () => {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      // Lock height, only slide top so the bottom of the panel
      // tracks the top of the keyboard instead of shrinking.
      panel.style.top = `${vv.offsetTop + (vv.height - panel.offsetHeight)}px`;
    };

    window.visualViewport?.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("scroll", handler);

    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("scroll", handler);
    };
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
      }}
    >
      <div
        id="comments-panel"
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: "12.5dvh",
          width: "100%",
          height: "75dvh",
          maxHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          background: "rgba(5, 8, 20, 0.75)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,229,255,0.06), 0 8px 32px rgba(0,0,0,0.4)",
          transition: isDragging ? "none" : "transform 0.22s ease, opacity 0.22s ease",
          transform: panelTransform,
          opacity: panelOpacity,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          willChange: "transform, opacity",
        }}
      >
        {/* Scanlines overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          opacity: 0.4,
        }} />

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
            padding: "0 16px 8px",
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>Comments</span>
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
        <div style={{
          height: 1,
          background: "linear-gradient(90deg, #00e5ff, transparent)",
          marginBottom: 4,
          opacity: 0.3,
        }} />

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

        {/* Unified control module */}
        <div
          style={{
            flexShrink: 0,
            background: "rgba(0,0,0,0.4)",
            borderTop: "1px solid rgba(0,229,255,0.1)",
            borderRadius: "0 0 24px 24px",
            padding: "12px 16px",
            paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Reaction well */}
          <div
            style={{
              background: "rgba(0,0,0,0.3)",
              borderRadius: 16,
              padding: "8px 12px",
              border: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              gap: 8,
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

          {/* Input row */}
          {replyTo && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
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
              onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,229,255,0.3)"; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; }}
              placeholder={replyTo ? `Reply to @${replyTo.userEmail}...` : "Add to the conversation..."}
              style={{
                flex: 1,
                borderRadius: 20,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "10px 14px",
                height: 40,
                fontSize: 16,
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
