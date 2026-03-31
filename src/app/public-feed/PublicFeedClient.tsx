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

    console.log("API DATA:", data); // 👈 HERE

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
    {Array.isArray(posts) && posts.length > 0 ? (
      posts.map((post, i) => {
        // FULL guard
        if (!post || typeof post !== "object") return null;

        const text =
          typeof post.caption === "string"
            ? post.caption
            : typeof post.text === "string"
            ? post.text
            : "Empty post";

        const image =
          typeof post.media_url === "string" && post.media_url.length > 0
            ? post.media_url
            : null;

        return (
          <div key={post.id || i} style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 8 }}>{text}</div>

            {image && (
              <img
                src={image}
                alt="post"
                style={{
                  width: "100%",
                  maxWidth: 500,
                  borderRadius: 8,
                }}
              />
            )}
          </div>
        );
      })
    ) : (
      <div>No posts yet</div>
    )}
  </div>
);
}