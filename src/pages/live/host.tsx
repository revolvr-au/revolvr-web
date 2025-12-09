// src/pages/live/host.tsx
import { useEffect, useState } from "react";
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
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  // Build viewer URL once we have sessionId
  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;

    const origin = window.location.origin;
    setViewerUrl(`${origin}/live/${data.sessionId}`);
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
      console.log("HOST TOKEN:", fixed.hostToken);

      setData(fixed);
    } catch (e: any) {
      console.error("startLive error", e);
      setError(e?.message ?? "Failed to start live");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyViewerLink() {
    if (!data) return;

    const url =
      viewerUrl ??
      (typeof window !== "undefined"
        ? `${window.location.origin}/live/${data.sessionId}`
        : "");

    if (!url) return;

    navigator.clipboard
      .writeText(url)
      .then(() => {
        console.log("Viewer link copied:", url);
      })
      .catch((err) => {
        console.error("Failed to copy viewer link", err);
      });
  }

  async function handleEndStream() {
    if (!data) return;

    setEnding(true);

    try {
      const res = await fetch("/api/live/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: data.sessionId }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("end error body:", text);
      }
    } catch (e) {
      console.error("handleEndStream error", e);
    } finally {
      setEnding(false);
      // Unmounting LiveKitRoom will close the connection.
      router.push("/public-feed");
    }
  }

  // Pre-stream screen
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="w-full max-w-xl px-6">
          <h1 className="text-3xl font-semibold mb-6">Host Live Stream</h1>

          <label className="block text-sm text-gray-300 mb-2">
            Stream title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Friday night hangout"
            className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />

          {error && (
            <p className="text-red-400 text-sm mt-3">
              Error: {error} (check console)
            </p>
          )}

          <button
            onClick={startLive}
            disabled={loading}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-pink-500 px-6 py-2 text-sm font-semibold text-white hover:bg-pink-600 disabled:opacity-60"
          >
            {loading ? "Preparing…" : "Go Live"}
          </button>
        </div>
      </div>
    );
  }

  // Live view with controls + LiveKit room
  return (
    <LiveKitRoom
      serverUrl={data.livekitUrl}
      token={data.hostToken}
      connect={true}
      video={true}
      audio={true}
    >
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Top control bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-black/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-sm">LIVE</span>
            <span className="text-sm text-gray-300 truncate max-w-xs">
              {data.title ?? "Untitled stream"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyViewerLink}
              className="text-xs px-3 py-1 rounded-full border border-white/30 hover:bg-white/10"
            >
              Copy viewer link
            </button>

            <button
              type="button"
              onClick={handleEndStream}
              disabled={ending}
              className="text-xs px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60"
            >
              {ending ? "Ending…" : "End Stream"}
            </button>
          </div>
        </header>

        {/* LiveKit UI */}
        <main className="flex-1 min-h-0">
          <VideoConference />
        </main>
      </div>
    </LiveKitRoom>
  );
}
