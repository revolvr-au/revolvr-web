// src/pages/live/host.tsx
import { useState } from "react";
import { useRouter } from "next/router";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type HostData = {
  sessionId: string;
  roomName: string;
  hostIdentity: string;
  hostToken: string; // JWT string
  livekitUrl: string;
  title?: string | null;
};

export default function HostLivePage() {
  const router = useRouter();

  const [data, setData] = useState<HostData | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

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

  async function copyViewerLink() {
    if (!data) return;

    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/live/${data.sessionId}`
        : "";

    if (!url) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } else {
        // Fallback – show the URL so they can copy manually
        alert(`Viewer link: ${url}`);
      }
    } catch (err) {
      console.error("Failed to copy viewer link", err);
      alert(`Viewer link: ${url}`);
    }
  }

  function endStream() {
    // For now: just leave the room by navigating away.
    // LiveKit disconnects when this page unmounts.
    router.push("/public-feed");
  }

  // Initial screen: form + Go Live button
  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-full max-w-xl px-6">
          <h1 className="text-2xl font-semibold mb-4">Host Live Stream</h1>

          <label className="block text-sm text-gray-300 mb-1">
            Stream title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Friday night hangout"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />

          <button
            onClick={startLive}
            disabled={loading}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-pink-600 px-5 py-2 text-sm font-semibold shadow-lg hover:bg-pink-500 disabled:opacity-60"
          >
            {loading ? "Preparing…" : "Go Live"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-400">
              Error: {error} (check console)
            </p>
          )}
        </div>
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
      {/* Top bar: LIVE + title + share + end buttons */}
      <header className="flex items-center justify-between px-4 py-3 bg-black text-white border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold">LIVE</span>
          <span className="ml-2 text-sm text-gray-300 truncate max-w-xs">
            {data.title ?? "Untitled stream"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyViewerLink}
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium hover:bg-white/10"
          >
            {shareCopied ? "Link copied" : "Copy viewer link"}
          </button>

          <button
            onClick={endStream}
            className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-500"
          >
            End Stream
          </button>
        </div>
      </header>

      {/* Default LiveKit UI for camera/mic/screen controls */}
      <VideoConference />
    </LiveKitRoom>
  );
}
