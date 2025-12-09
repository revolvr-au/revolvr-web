// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerStatus = "loading" | "live" | "ended" | "error";

type ViewerData = {
  roomName: string;
  viewerIdentity: string;
  viewerToken: string;
  livekitUrl: string;
  status: "live" | "ended";
  title?: string | null;
};

export default function ViewerPage() {
  const router = useRouter();

  const [status, setStatus] = useState<ViewerStatus>("loading");
  const [data, setData] = useState<ViewerData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;

    // 🔹 Normalise the dynamic route param to a plain string
    const raw = router.query.sessionId;
    let id: string | null = null;

    if (typeof raw === "string") {
      id = raw;
    } else if (Array.isArray(raw) && raw.length > 0) {
      id = raw[0];
    }

    if (!id) {
      setError("Missing stream id in the URL.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    const loadViewerData = async () => {
      try {
        setStatus("loading");

        const res = await fetch(
          `/api/live/${encodeURIComponent(id)}/viewer`
        );

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404) {
            // No active session / not found → treat as ended
            setStatus("ended");
            return;
          }

          const text = await res.text();
          console.error("[viewer] API error", res.status, text);
          setError("Revolvr glitched out loading this stream.");
          setStatus("error");
          return;
        }

        const json = await res.json();

        const fixed: ViewerData = {
          ...json,
          viewerToken:
            typeof json.viewerToken === "string"
              ? json.viewerToken
              : json.viewerToken?.token ?? "",
        };

        setData(fixed);
        setStatus(fixed.status === "ended" ? "ended" : "live");
      } catch (e) {
        if (cancelled) return;
        console.error("[viewer] fetch error", e);
        setError("Revolvr glitched out loading this stream.");
        setStatus("error");
      }
    };

    loadViewerData();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.sessionId]);

  // 🔸 Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p className="text-sm text-white/70">Loading stream…</p>
      </div>
    );
  }

  // 🔸 Error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
        <p className="text-sm text-red-300 mb-3">
          {error ?? "Revolvr glitched out loading this stream."}
        </p>
        <button
          onClick={() => {
            window.location.href = "/public-feed";
          }}
          className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium"
        >
          Back to feed
        </button>
      </div>
    );
  }

  // 🔸 Ended state (nice full-screen ended message)
  if (status === "ended" || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white px-4">
        <div className="text-center space-y-3">
          <div className="text-4xl mb-2">📺</div>
          <h1 className="text-xl font-semibold">This stream has ended</h1>
          <p className="text-sm text-white/60 max-w-sm mx-auto">
            The host has wrapped up this session. Head back to the Revolvr feed
            to see what else is spinning.
          </p>
          <button
            onClick={() => {
              window.location.href = "/public-feed";
            }}
            className="mt-4 px-5 py-2 rounded-full bg-white text-black text-sm font-medium"
          >
            Back to feed
          </button>
        </div>
      </div>
    );
  }

  // 🔸 Live viewer
  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.viewerToken}
      connect={true}
      video={false} // viewer doesn't need to send video
      audio={true}
    >
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/80 text-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-sm text-white/80 truncate max-w-[240px] sm:max-w-md">
              {data.title ?? "Live on Revolvr"}
            </span>
          </div>
          <button
            onClick={() => {
              window.location.href = "/public-feed";
            }}
            className="text-xs text-white/70 hover:text-white"
          >
            Back to feed
          </button>
        </header>

        {/* Video area */}
        <main className="flex-1 bg-black flex items-center justify-center">
          <div className="w-full h-full max-w-5xl mx-auto aspect-video bg-black">
            <VideoConference />
          </div>
        </main>
      </div>
    </LiveKitRoom>
  );
}
