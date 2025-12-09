// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ended"; title?: string | null }
  | { kind: "live"; title?: string | null; token: string; livekitUrl: string };

export default function ViewerPage() {
  const router = useRouter();

  const [state, setState] = useState<ViewerState>({ kind: "loading" });

  useEffect(() => {
    const id = router.query.sessionId;

    if (!id || typeof id !== "string") return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/live/${encodeURIComponent(id)}/viewer`
        );

        if (cancelled) return;

        if (res.status === 404 || res.status === 410) {
          setState({ kind: "ended" });
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          console.error("viewer error body:", text);
          setState({
            kind: "error",
            message: "Could not load stream.",
          });
          return;
        }

        const raw = await res.json();
        console.log("viewer data RAW", raw);

        const status = raw.status as string | undefined;

        if (status && status !== "live") {
          setState({ kind: "ended", title: raw.title ?? null });
          return;
        }

        const token: string | undefined =
          raw.viewerToken ?? raw.token ?? raw.hostToken;
        const livekitUrl: string | undefined = raw.livekitUrl ?? raw.url;

        if (!token || !livekitUrl) {
          setState({
            kind: "error",
            message: "Stream is not available right now.",
          });
          return;
        }

        setState({
          kind: "live",
          title: raw.title ?? null,
          token,
          livekitUrl,
        });
      } catch (e) {
        console.error("viewer load error", e);
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Could not load stream.",
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [router.query.sessionId]);

  // --- UI states -----------------------------------------------------------

  if (state.kind === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p>Loading stream…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 12 }}>Stream unavailable</h1>
          <p style={{ marginBottom: 24, color: "#ccc" }}>{state.message}</p>
          <button
            onClick={() => router.push("/public-feed")}
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: "#ff0055",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "ended") {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 12 }}>This stream has ended</h1>
          {state.title && (
            <p style={{ marginBottom: 8, color: "#aaa" }}>{state.title}</p>
          )}
          <p style={{ marginBottom: 24, color: "#888", fontSize: 14 }}>
            Check the feed for other live broadcasts.
          </p>
          <button
            onClick={() => router.push("/public-feed")}
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: "#ff0055",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  // LIVE state
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000", color: "#fff" }}>
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid #222",
          background: "rgba(0,0,0,0.85)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#ff0055",
            marginRight: 8,
          }}
        />
        <span style={{ fontWeight: 600 }}>LIVE</span>
        {state.title && (
          <span style={{ marginLeft: 12, color: "#aaa", fontSize: 14 }}>
            {state.title}
          </span>
        )}
      </header>

      <LiveKitRoom
        serverUrl={state.livekitUrl}
        token={state.token}
        connect={true}
        video={true}
        audio={true}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
