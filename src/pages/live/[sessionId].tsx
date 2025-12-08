// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerData = {
  sessionId: string;
  roomName: string;
  viewerIdentity: string;
  viewerToken: string;
  livekitUrl: string;
};

export default function ViewerLivePage() {
  const router = useRouter();
  const { sessionId } = router.query;           // ✅ use sessionId
  const [data, setData] = useState<ViewerData | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const id = String(sessionId);

    (async () => {
      const res = await fetch(`/api/live/${id}/viewer`);
      const d = await res.json();
      setData(d);
    })();
  }, [sessionId]);

  if (!sessionId) return <p style={{ padding: 24 }}>Loading…</p>;
  if (!data) return <p style={{ padding: 24 }}>Loading stream…</p>;

  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.viewerToken}
      connect={true}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
