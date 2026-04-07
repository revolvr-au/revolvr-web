"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CommentsPage() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");

  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!postId) return;

    fetch(`/api/comments?postId=${postId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setComments(data.comments);
      });
  }, [postId]);

  const sendComment = async () => {
    if (!text.trim()) return;

    await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
        userEmail: "test@user.com", // temp
        body: text,
      }),
    });

    setText("");

    // reload
    const res = await fetch(`/api/comments?postId=${postId}`);
    const data = await res.json();
    if (data?.ok) setComments(data.comments);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Comments</h2>

      <div style={{ marginTop: 20 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ marginBottom: 10 }}>
            <strong>{c.userEmail}</strong>: {c.body}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
        />
        <button onClick={sendComment}>Send</button>
      </div>
    </div>
  );
}