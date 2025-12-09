// src/pages/live/host.tsx
import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type HostData = {
  sessionId: string;
  roomName: string;
  hostIdentity: string;
  hostToken: string;
  livekitUrl: string;
  title?: string | null;
};

export default function HostLivePage() {
  const router = useRouter();

  const [data, setData] = useState<HostData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewerUrl = useMemo(() => {
    if (!data || typeof window === "undefined") return "";
    return `${window.location.origin}/live/${encodeURIComponent(
      data.sessionId
    )}`;
  }, [data]);

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

      const fixed: HostData = {
        ...raw,
        hostToken:
          typeof raw.hostToken === "string"
            ? raw.hostToken
            : raw.hostToken?.token ?? "",
      };

      console.log("create data (fixed)", fixed);
      setData(fixed);
    } catch (e: any) {
      console.error("startLive error", e);
      setError(e?.message ?? "Failed to start live");
    } finally {
      setLoading(false);
    }
  }

  async function handleEndStream() {
    if (!data) return;

    try {
      await fetch(
        `/api/live/${encodeURIComponent(data.sessionId)}/end`,
        { method: "POST" }
      );
    } catch (e) {
      console.error("end stream error", e);
      // we still redirect even if this fails, so host isn't stuck
    }

    router.push("/public-feed");
  }

  function handleCopyLink() {
    if (!viewerUrl) return;
    navigator.clipboard
      .writeText(viewerUrl)
      .catch((err) => console.error("copy failed", err));
  }

  // Pre-live: show simple form
  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <div style={{ width: "100%", maxWidth: 600, padding: "0 24px" }}>
          <h1 style={{ fontSize: 32, marginBottom: 24 }}>Host Live Stream</h1>

          <label
            htmlFor="stream-title"
            style={{
              display: "block",
              marginBottom: 8,
              fontSize: 14,
              color: "#ccc",
            }}
          >
            Stream title
          </label>
          <input
            id="stream-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Friday night hangout"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #333",
              background: "#050814",
              color: "#fff",
              outline: "none",
            }}
          />

          <button
            onClick={startLive}
            disabled={loading}
            style={{
              marginTop: 24,
              padding: "10px 28px",
              borderRadius: 999,
              border: "none",
              background: "#ff0055",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {loading ? "Preparing…" : "Go Live"}
          </button>

          {error && (
            <p style={{ marginTop: 16, color: "#ff5c5c" }}>
              Error: {error} (check console)
            </p>
          )}
        </div>
      </div>
    );
  }

  // Live state
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff" }}>
      {/* Top bar */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid #222",
          background: "rgba(0,0,0,0.85)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#ff0055",
            }}
          />
          <span style={{ fontWeight: 600 }}>LIVE</span>
          <span style={{ marginLeft: 12, color: "#aaa", fontSize: 14 }}>
            {data.title ?? "Untitled stream"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid #444",
              background: "transparent",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Copy viewer link
          </button>

          <button
            onClick={handleEndStream}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "none",
              background: "#ff0055",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            End Stream
          </button>
        </div>
      </header>

      {/* LiveKit room */}
      <LiveKitRoom
        serverUrl={data.livekitUrl}
        token={data.hostToken}
        connect={true}
        video={true}
        audio={true}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
