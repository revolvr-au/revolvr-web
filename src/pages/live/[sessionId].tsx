// src/pages/live/[sessionId].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerData = {
  token: string;
  livekitUrl: string;
  identity: string;
};

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<ViewerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const id =
      typeof sessionId === "string" ? sessionId : sessionId[0] ?? "";

    if (!id) return;

    async function fetchToken() {
      try {
        const res = await fetch(`/api/live/${id}/viewer`);
        if (!res.ok) {
          const text = await res.text();
          console.error("viewer token error:", res.status, text);
          setError(`Failed to load stream (${res.status})`);
          return;
        }
        const json = (await res.json()) as ViewerData;
        setData(json);
      } catch (e) {
        console.error("viewer token fetch error", e);
        setError("Network error loading stream");
      }
    }

    fetchToken();
  }, [sessionId]);

  if (error) {
    return <p style={{ padding: 24, color: "red" }}>{error}</p>;
  }

  if (!data) {
    return <p style={{ padding: 24 }}>Loading stream…</p>;
  }

  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.token}
      connect={true}
      audio={true}
      video={true}
    >
      {/* Simple viewer UI */}
      <div style={{ padding: 16 }}>
        <span style={{ color: "red", fontWeight: "bold" }}>● LIVE</span>
        <span style={{ marginLeft: 8 }}>Viewer</span>
      </div>
      <VideoConference />
    </LiveKitRoom>
  );
}
