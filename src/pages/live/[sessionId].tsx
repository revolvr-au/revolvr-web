// src/pages/live/[sessionId].tsx

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoRenderer } from "@livekit/components-react";

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;

    async function fetchToken() {
      const res = await fetch(`/api/live/${sessionId}/viewer`);
      const json = await res.json();
      setData(json);
    }

    fetchToken();
  }, [sessionId]);

  if (!data) return <p>Loading stream…</p>;

  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.token}
      connect={true}
      audio={true}
      video={true}
    >
      {/* Basic clean viewer layout */}
      <div
        style={{
          width: "100%",
          height: "100vh",
          background: "black",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <VideoRenderer />
      </div>
    </LiveKitRoom>
  );
}
