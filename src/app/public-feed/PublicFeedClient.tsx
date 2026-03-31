"use client";

import { useEffect, useState } from "react";

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<any[]>([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    fetch("/api/posts")
      .then(res => res.json())
      .then(data => {
        console.log("API RESPONSE:", data);

        if (Array.isArray(data.posts)) {
          setPosts(data.posts);
          setStatus("ok");
        } else {
          console.error("BAD SHAPE:", data);
          setStatus("bad-data");
        }
      })
      .catch(err => {
        console.error("FETCH ERROR:", err);
        setStatus("error");
      });
  }, []);

  return (
    <div>
      <div>CLIENT OK</div>
      <div>Status: {status}</div>
      <div>Posts count: {posts.length}</div>

      <div style={{ marginTop: 20 }}>
        {posts.map((post, i) => (
          <div
            key={post.id || i}
            style={{
              marginBottom: 20,
              padding: 12,
              borderRadius: 12,
              background: "#0b1220",
              border: "1px solid #1e293b"
            }}
          >
            {/* USER */}
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              {post.handle || post.userEmail || "user"}
            </div>

            {/* IMAGE */}
            {post.media_url && (
              <img
                src={post.media_url}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  marginTop: 10
                }}
              />
            )}

            {/* CAPTION */}
            {post.caption && (
              <div style={{ marginTop: 6 }}>
                {post.caption}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}