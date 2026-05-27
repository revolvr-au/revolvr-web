"use client";

import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoCanvas() {
  // Correct LiveKit hook signature
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: false },
  ]);

  const videoTrackRef = tracks.find(
    (t) => t.publication?.kind === "video"
  );

  const videoTrack = videoTrackRef?.publication?.track;

  if (!videoTrack) return null;

  return (
    <video
      ref={(el) => {
        if (!el) return;
        videoTrack.attach(el);
      }}
      className="absolute inset-0 h-full w-full object-cover z-0"
      autoPlay
      playsInline
      muted
    />
  );
}