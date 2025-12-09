// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerData = {
  roomName: string;
  viewerIdentity: string;
  viewerToken: string;
  livekitUrl: string;
};

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    if (typeof sessionId !== "string") {
      setError("Missing session id");
      setLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/live/${sessionId}/viewer`);

        if (!res.ok) {
          const text = await res.text();
          console.error("[viewer] error body:", text);
          throw new Error(`API error ${res.status}`);
        }

        const json = (await res.json()) as ViewerData;
        console.log("[viewer] got data", json);
        setData(json);
      } catch (e: any) {
        console.error("[viewer] fetch error", e);
        setError(e?.message ?? "Failed to load stream");
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [router.isReady, sessionId]);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading stream…</p>;
  }

  if (error || !data) {
    return (
      <p style={{ padding: 24, color: "red" }}>
        Error loading stream: {error ?? "Unknown error"}
      </p>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.viewerToken}
      connect={true}
      video={true}
      audio={true}
    >
      <div style={{ padding: 16 }}>
        <span style={{ color: "red", fontWeight: "bold" }}>● LIVE</span>
        <span style={{ marginLeft: 8 }}>Watching stream</span>
      </div>
      <VideoConference />
    </LiveKitRoom>
  );
}
