"use client";

import { useEffect, useState } from "react";

type Post = {
  id: string;
  text?: string;
  content?: string;
  caption?: string;
  media_url?: string;
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

        console.log("API DATA:", data); // ✅ debug

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

  useEffect(() => {
    console.log("POSTS FULL:", posts);
  }, [posts]);

  // ✅ CLEAN loading check
  if (loading) {
    return <div style={{ padding: 20 }}>Loading feed...</div>;
  }

  // ✅ SAFE DEBUG RENDER
return (
  <div style={{ padding: 20 }}>
    PUBLIC FEED SAFE MODE
  </div>
);
}