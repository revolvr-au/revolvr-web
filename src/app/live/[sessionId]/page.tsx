"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const safeSessionId = params?.sessionId ?? "";

  const sessionId = useMemo(() => {
    try {
      return decodeURIComponent(safeSessionId);
    } catch {
      return safeSessionId;
    }
  }, [safeSessionId]);

  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  /* ================= MOBILE DETECT ================= */

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
  }, []);

  /* ================= JOIN CONTROL ================= */

  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Auto-join only on desktop
    if (!isMobile) {
      setJoined(true);
    }
  }, [isMobile]);

  /* ================= TOKEN LOAD ================= */

  const [lkUrl, setLkUrl] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    const loadToken = async () => {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            role: isHost ? "host" : "viewer",
          }),
        });

        if (!res.ok) return;

        const data = await res.json();
        setLkUrl(data.url);
        setToken(data.token);
      } catch {}
    };

    loadToken();
  }, [sessionId, isHost]);

  /* ================= RENDER ================= */

  return (
    <div className="bg-[#050814] text-white h-[100dvh] w-full relative">

      {!joined && isMobile && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <button
            onClick={() => setJoined(true)}
            className="px-6 py-4 rounded-2xl bg-emerald-400 text-black font-semibold text-lg"
          >
            Tap to Join Live
          </button>
        </div>
      )}

      {joined && token && lkUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={lkUrl}
          connect={true}
          audio
          video
          className="h-full"
        >
          <RoomAudioRenderer />
          <Stage />
          {!isMobile && <ControlBar />}
        </LiveKitRoom>
      )}

      {!token && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60">
          Loading live session...
        </div>
      )}
    </div>
  );
}

/* ================= VIDEO STAGE ================= */

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: true }
  );

  const active =
    tracks.find((t) => (t as any)?.source === Track.Source.ScreenShare) ||
    tracks.find((t) => (t as any)?.source === Track.Source.Camera) ||
    null;

  if (!active) {
    return (
      <div className="h-full w-full grid place-items-center text-white/50">
        Waiting for video…
      </div>
    );
  }

  return <ParticipantTile trackRef={active as any} className="h-full w-full" />;
}
