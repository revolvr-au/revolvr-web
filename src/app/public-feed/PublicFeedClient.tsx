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
    </div>
  );
}