// src/pages/live/host.tsx
import { useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type HostData = {
  sessionId: string;
  roomName: string;
  hostIdentity: string;
  hostToken: string; // always a JWT string
  livekitUrl: string;
  title?: string | null;
};

export default function HostLivePage() {
  const [data, setData] = useState<HostData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startLive() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      console.log("create response status", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("create error body:", text);
        throw new Error(`API error ${res.status}`);
      }

      const raw = await res.json();
      console.log("create data RAW", raw);

      // Normalise hostToken so it's ALWAYS a JWT string
      const fixed: HostData = {
        ...raw,
        hostToken:
          typeof raw.hostToken === "string"
            ? raw.hostToken
            : raw.hostToken?.token ?? "",
      };

      console.log("create data (fixed)", fixed);
      console.log("HOST TOKEN:", fixed.hostToken);

      setData(fixed);
    } catch (e: any) {
      console.error("startLive error", e);
      setError(e?.message ?? "Failed to start live");
    } finally {
      setLoading(false);
    }
  }

  // Initial screen: title input + Go Live button
  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Host Live Test</h1>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Stream title"
          style={{ padding: 8, width: "100%", maxWidth: 400 }}
        />
        <button
          onClick={startLive}
          disabled={loading}
          style={{ marginTop: 16, padding: "10px 20px" }}
        >
          {loading ? "Preparing…" : "Go Live"}
        </button>
        {error && (
          <p style={{ marginTop: 12, color: "red" }}>
            Error: {error} (check console)
          </p>
        )}
      </div>
    );
  }

  // LiveKit room once we have the token + URL
  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.hostToken}
      connect={true}
      video={true}
      audio={true}
    >
      <div style={{ padding: 16 }}>
        <span style={{ color: "red", fontWeight: "bold" }}>● LIVE</span>
        <span style={{ marginLeft: 8 }}>
          {data.title ?? "Untitled stream"}
        </span>
      </div>
      <VideoConference />
    </LiveKitRoom>
  );
}
