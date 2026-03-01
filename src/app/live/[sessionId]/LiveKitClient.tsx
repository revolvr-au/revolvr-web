"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  useTracks,
  useConnectionState,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import { useState } from "react";

export default function LiveKitClient({
  token,
  lkUrl,
  isMobile,
  onlySubscribed,
}: {
  token: string;
  lkUrl: string;
  isMobile: boolean;
  onlySubscribed: boolean;
}) {
  const [connectionState, setConnectionState] = useState<string>("connecting");

  return (
    <LiveKitRoom
      token={token}
      serverUrl={lkUrl}
      connect={true}
      audio
      video
      className="h-full"
      onConnected={() => setConnectionState("connected")}
      onDisconnected={() => setConnectionState("disconnected")}
      onReconnecting={() => setConnectionState("reconnecting")}
      onReconnected={() => setConnectionState("connected")}
    >
      <RoomAudioRenderer />

      <Stage onlySubscribed={onlySubscribed} />

      {connectionState !== "connected" && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 text-xs bg-black/60 px-3 py-1 rounded-full">
          {connectionState === "connecting" && "Connecting…"}
          {connectionState === "reconnecting" && "Reconnecting…"}
          {connectionState === "disconnected" && "Connection lost"}
        </div>
      )}
    </LiveKitRoom>
  );
}

function Stage({ onlySubscribed }: { onlySubscribed: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed }
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