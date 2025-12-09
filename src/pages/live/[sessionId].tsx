// src/pages/live/[sessionId].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";

type ViewerData = {
  roomName: string;
  viewerIdentity: string;
  viewerToken: string; // JWT string
  livekitUrl: string;
  title?: string | null;
};

export default function ViewerPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<ViewerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const id = String(sessionId);

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/live/${encodeURIComponent(id)}/viewer`);

        console.log("[viewer] response status", res.status);

        if (!res.ok) {
          const text = await res.text();
          console.error("[viewer] error body:", text);
          throw new Error(`API error ${res.status}`);
        }

        const raw = await res.json();
        console.log("[viewer] RAW data", raw);

        const fixed: ViewerData = {
          ...raw,
          viewerToken:
            typeof raw.viewerToken === "string"
              ? raw.viewerToken
              : raw.viewerToken?.token ?? "",
        };

        console.log("[viewer] fixed data", fixed);
        setData(fixed);
      } catch (e: any) {
        console.error("[viewer] load error", e);
        setError(e?.message ?? "Failed to join stream");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [sessionId]);

  const title = data?.title ?? "Watching stream";

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="space-y-2 text-center px-4">
          <p className="text-red-400 font-semibold">Failed to join stream</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Connecting to stream…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top LIVE bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold">LIVE</span>
          <span className="ml-2 text-sm text-gray-300 truncate max-w-xs">
            {title}
          </span>
        </div>
      </header>

      {/* Centered video */}
      <main className="flex-1 flex items-center justify-center p-2 md:p-4">
        <div className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden border border-white/10">
          <LiveKitRoom
            serverUrl={data.livekitUrl}
            token={data.viewerToken}
            connect={true}
            video={true}
            audio={true}
          >
            <VideoConference />
          </LiveKitRoom>
        </div>
      </main>
    </div>
  );
}
