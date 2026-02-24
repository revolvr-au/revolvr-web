import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function VideoCanvas() {
  const tracks = useTracks([Track.Source.Camera]);

  const videoTrack = tracks.find(t => t.publication?.kind === "video");

  if (!videoTrack?.publication?.track) return null;

  return (
    <video
      ref={(el) => {
        if (el) {
          videoTrack.publication.track.attach(el);
        }
      }}
      className="absolute inset-0 h-full w-full object-cover z-0"
      autoPlay
      playsInline
      muted
    />
  );
}