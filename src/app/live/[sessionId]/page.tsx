// src/app/live/[sessionId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

import {
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function LiveRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();

  const sessionId = decodeURIComponent(params?.sessionId ?? "");
  const role = searchParams?.get("role") || "";
  const isHost = role === "host";

  const [lkUrl, setLkUrl] = useState("");
  const [token, setToken] = useState("");
  const [joined, setJoined] = useState(!isHost);

  // Fetch LiveKit token
  useEffect(() => {
    async function initLive() {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: sessionId,
            identity:
              (isHost ? "host-" : "viewer-") + crypto.randomUUID(),
            role: isHost ? "host" : "viewer",
          }),
        });

        const data = await res.json();
        if (!res.ok || !data?.token) {
          console.error("Token fetch failed", data);
          return;
        }

        setLkUrl(process.env.NEXT_PUBLIC_LIVEKIT_URL || "");
        setToken(data.token);
      } catch (err) {
        console.error("Live init error", err);
      }
    }

    if (sessionId) {
      initLive();
    }
  }, [sessionId, isHost]);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {token && lkUrl ? (
        <LiveKitRoom
          token={token}
          serverUrl={lkUrl}
          connect={isHost ? joined : true}
          video={isHost && joined}
          audio
          className="h-full w-full"
        >
          <RoomAudioRenderer />
          <StageVideo />
        </LiveKitRoom>
      ) : (
        <div className="h-full w-full grid place-items-center text-white/40 text-sm">
          Connecting…
        </div>
      )}

      {isHost && !joined && (
        <div className="absolute inset-x-0 bottom-12 px-6 z-50">
          <button
            onClick={() => setJoined(true)}
            className="w-full rounded-2xl bg-emerald-400 py-4 text-black font-semibold text-lg"
          >
            Go Live
          </button>
        </div>
      )}
    </div>
  );
}

function StageVideo() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const hostTrack =
    tracks.find((t) =>
      (t.participant as any)?.identity?.toLowerCase().includes("host")
    ) || tracks[0];

  if (!hostTrack) return null;

  return (
    <ParticipantTile
      trackRef={hostTrack as any}
      className="h-full w-full object-cover"
    />
  );
}