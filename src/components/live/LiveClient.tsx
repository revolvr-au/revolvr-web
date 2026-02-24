"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useEffect, useState } from "react";
import LiveRoom from "./LiveRoom";

export default function LiveClient() {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/live/token")
      .then(res => res.json())
      .then(data => {
        setToken(data.token);
        setUrl(data.url);
      })
      .catch(() => {
        console.error("Failed to fetch LiveKit token");
      });
  }, []);

  if (!token || !url) {
    return <div className="text-white p-4">Connecting to LIVE...</div>;
  }

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      audio={true}
      video={true}
    >
      <LiveRoom />
    </LiveKitRoom>
  );
}