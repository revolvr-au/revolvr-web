"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  text?: string;
  content?: string;
  caption?: string;
  media_url?: string; // ✅ ADD THIS
};

export default function PublicFeedClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const res = await fetch("/api/posts");

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        if (Array.isArray(data)) {
          setPosts(data);
        } else if (Array.isArray(data.posts)) {
          setPosts(data.posts);
        } else if (Array.isArray(data.data)) {
          setPosts(data.data);
        } else {
          console.warn("Unexpected API shape:", data);
          setPosts([]);
        }
      } catch (err) {
        console.error("Feed error:", err);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // ✅ Proper debug (outside JSX)
  useEffect(() => {
    if (posts.length > 0) {
      console.log("Post sample:", posts[0]);
    }
  }, [posts]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading feed...</div>;
  }

  return (
  <div style={{ padding: 20 }}>
    {posts.length === 0 ? (
      <div>No posts yet</div>
    ) : (
      posts.map((post) => (
        <div key={post.id} style={{ marginBottom: 20 }}>
          
          {/* TEXT */}
          <div style={{ marginBottom: 8 }}>
            {post.caption ?? post.text ?? "Empty post"}
          </div>

          {/* IMAGE */}
          {typeof post.media_url === "string" && post.media_url && (
  <img
    src={post.media_url}
    alt="post"
    style={{
      width: "100%",
      maxWidth: 500,
      borderRadius: 8,
    }}
  />
)}

        </div>
      ))
    )}
  </div>
);
}