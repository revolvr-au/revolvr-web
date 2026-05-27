"use client";

import { use, useEffect, useRef, useState } from "react"; // 1. Added 'use' here
import { useRouter } from "next/navigation"; // 2. Removed 'useParams'
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { createSupabaseBrowserClient } from "@/supabase-browser";
import CommentsList from "@/components/CommentsList";

// 3. Update the function to accept 'params' as a Promise
export default function CommentsPage({ params }: { params: Promise<{ postId: string }> }) {
  const router = useRouter();
  
  // 4. Unwrap the promise to get the postId
  const { postId } = use(params); 

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [replyTo, setReplyTo] = useState<{ id: string; userEmail: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  // ... rest of your file stays exactly the same

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [refreshKey]);

  const sendComment = async () => {
    if (!commentText.trim() || !userEmail || !postId) return;

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        userEmail,
        body: commentText,
        parentId: replyTo?.id ?? null,
      }),
    });

    if (res.ok) {
      setCommentText("");
      setReplyTo(null);
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100dvh",
      background: "#050814",
      color: "white",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <button
          onClick={() => router.back()}
          type="button"
          style={{
            background: "none",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: 4,
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Comments</span>
      </div>

      {/* Scrollable list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "12px 16px",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <CommentsList
          postId={postId}
          refreshKey={refreshKey}
          setReplyTo={setReplyTo}
          replyTo={replyTo}
        />
      </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "#050814",
        padding: "8px 16px",
        paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
      }}>
        {replyTo && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6, paddingLeft: 4 }}>
            Replying to @{replyTo.userEmail}
            <span onClick={() => setReplyTo(null)} style={{ marginLeft: 8, cursor: "pointer" }}>✕</span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder={replyTo ? `Reply to @${replyTo.userEmail}...` : "Add a comment..."}
            style={{
              flex: 1,
              borderRadius: 20,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              padding: "8px 14px",
              height: 40,
              fontSize: 14,
              color: "white",
              outline: "none",
              minWidth: 0,
            }}
          />
          <button
            onClick={sendComment}
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
  );
}
