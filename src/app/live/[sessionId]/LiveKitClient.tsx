"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  ParticipantTile,
  ControlBar,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

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
  return (
    <LiveKitRoom
      token={token}
      serverUrl={lkUrl}
      connect={true}
      // iOS behaves better if we only request devices after user gesture (we only render this after tap)
      audio
      video
      className="h-full"
    >
      <RoomAudioRenderer />
      <Stage onlySubscribed={onlySubscribed} />
      {!isMobile && <ControlBar />}
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
